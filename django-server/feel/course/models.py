import uuid

from django.db import models, transaction
from django.utils.text import slugify
from django.core.cache import cache
from django.core.exceptions import PermissionDenied


from core.models import TimestampedModel, UUIDModel, SlugModel
from concept.models import Concept


class Course(TimestampedModel, UUIDModel):
    name = models.CharField(max_length=256)
    is_published = models.BooleanField(default=False)
    intro = models.TextField(default="", blank=True)
    how_to_learn = models.TextField(default="", blank=True)
    where_to_go_from_here = models.TextField(default="", blank=True)


    @property
    def slug(self):
        if not self.is_published:
            return None
        return self.courseslug_set.last().slug

    #todo -> Change to courseconcept 
    @property
    def concepts(self):
        return CourseConcept.courseconcepts.items(self)

    @property
    def _dependencies(self):
        dependencies = [dep for dep in self.conceptdependency_set.only('start', 'end').all()]
        return dependencies

    @property
    def _dependencies_cache_key(self):
        return "course:{id}:dependencies".format(id=self.id)

    @property
    def dependencies(self):
        return self.get_cacheable_attr('_dependencies', self._dependencies_cache_key)
    
    @property
    def _pretest_quizzes(self):
        concepts = [cc.concept for cc in self.concepts]
        quiz_by_concept_id = {}
        for concept in concepts:
            quiz_by_concept_id[str(concept.id)] = concept.course_pretest_quiz
        return quiz_by_concept_id

    @property
    def _pretest_cache_key(self):
        return "course:{id}:quizzes".format(id=self.id)

    @property
    def pretest_quizzes(self):
        return self.get_cacheable_attr('_pretest_quizzes', self._pretest_cache_key)

    def get_cacheable_attr(self, attr, cache_key):
        #import ipdb; ipdb.set_trace()
        cached_attr = cache.get(cache_key)
        if cached_attr is not None:
            return cached_attr
        return getattr(self, attr)

    def cache_attr(self, attr, cache_key):
        return cache.set(cache_key, getattr(self, attr))

    def evict_attr_from_cache(self, cache_key):
        return cache.delete(cache_key)


    @property
    def url(self):
        return "/course/{}/"(slugify(self.name))


    def get_student_progress(self, user_key):
        concept_progress = {}

        for cc in self.concepts:
            concept = cc.concept
            concept_progress[str(concept.id)] = concept.get_student_progress(user_key)
        return concept_progress


    def publish_and_slugify(self):
        self.is_published = True
        with transaction.atomic():
            slug = slugify(self.name)
            previous = CourseSlug.objects.filter(slug__contains=slug).last()
            if previous is not None:
                try:
                    number = int(previous.slug.split("-")[-1]) + 1
                except ValueError:
                    number = 1
                slug = "{}-{}".format(slug, number)

            courseslug = CourseSlug.objects.create(course=self, slug=slug)
            CourseSlug.objects.filter(course=self).exclude(slug=slug).delete()
            courseconcepts = [c for c in self.courseconcept_set.select_related('concept').all()]
            for cc in courseconcepts:
                cc.slugify()
            self.save()
        return courseslug


    def unpublish(self):
        self.is_published = False
        self.evict_content_from_cache()
        with transaction.atomic():
            self.courseslug_set.all().delete()
            self.save()
            self.courseconcept_set.all().update(slug="")

    def cache_content(self):
        courseconcepts = [c for c in self.courseconcept_set.select_related('concept').all()]
        for cc in courseconcepts:
            cc.cache_page()
        self.cache_attr('_pretest_quizzes', self._pretest_cache_key)
        self.cache_attr('_dependencies', self._dependencies_cache_key)

    def evict_content_from_cache(self):
        for c in self.courseconcept_set.select_related('concept'):
            c.concept.evict_cached_page()
        self.evict_attr_from_cache(self._pretest_cache_key)
        self.evict_attr_from_cache(self._dependencies_cache_key)

    def add_concept(self, name):
        concept = Concept.objects.create(created_by=self.created_by,\
                            last_modified_by=self.created_by, name=name)
        courseconcept = CourseConcept.objects.create(course=self,concept=concept)
        return concept


    def __str__(self):
        return "{} created by {} - Published? {}".format(self.name, self.created_by, self.is_published)


class CourseSlug(SlugModel):
    #use one-to-one instead
    course = models.ForeignKey(Course)

    def __str__(self):
        return "{} - {}".format(self.course, self.slug)



class CourseConceptManager(models.Manager):

    def items(self, course):
        return course.courseconcept_set.select_related('concept').only('concept').all()


class CourseConcept(TimestampedModel, UUIDModel):
    course = models.ForeignKey(Course)
    concept = models.ForeignKey(Concept)
    slug = models.CharField(max_length=200, default="")

    courseconcepts = CourseConceptManager()


    @property
    def url(self):
        return "{}{}/".format(self.course.url, slugify(self.concept.name))


    def slugify(self):
        self.slug = self.concept.slug
        self.save()
        return self.slug


    def cache_page(self):
        self.concept.cache_page()

    def __str__(self):
        return "{} belonging to {}".format(self.concept, self.course)


    class Meta:
        unique_together = ("course", "concept", )



class ConceptDependency(TimestampedModel, UUIDModel):
    course = models.ForeignKey(Course)
    start = models.ForeignKey(CourseConcept, related_name="start_set")
    end = models.ForeignKey(CourseConcept, related_name="end_set")

    def __str__(self):
        return "{} -> {} in {}".format(self.start, self.end, self. course)


    class Meta:
        unique_together = ('course', 'start', 'end', )
