from django.contrib import admin

from .models import Concept, ConceptSection


class ConceptSectionInline(admin.StackedInline):
    model = ConceptSection
    extra = 2


class ConceptAdmin(admin.ModelAdmin):
    inlines = [ConceptSectionInline]
    

admin.site.register(Concept, ConceptAdmin)