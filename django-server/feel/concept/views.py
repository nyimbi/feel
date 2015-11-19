import uuid

from django.shortcuts import render
from django.http import Http404
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.utils import timezone

from rest_framework.views  import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.views import get_user_and_user_key

from concept.models import Concept, ConceptSection
from concept.serializers import ConceptSerializer, ConceptSectionSerializer



class ConceptDetailView(APIView):
    """
    GET, POST and PUT APIs for individual concepts
    """

    def get(self, request, concept_id, format=None):
        """
        Get concept by concept_id
        """
        try:
            concept = Concept.objects.get(pk=concept_id)
        except (IndexError, ValueError):
            raise Http404

        serializer = ConceptSerializer(concept)
        data = serializer.data
        return Response(data)


    def post(self, request, concept_id, format=None):
        """
        Create new concept
        Algo:
        1. If concept exists raise 400
        2. Validate data
        3. If data is invalid raise 400
        4. Preprocess data
        5. Transaction
            1. Save Concept
            2. Save Sections
        6. Return Response
        """
        return self._save_concept_and_return_response(request, request.user, self._create_concept_object)


    def _create_concept_object(self, concept_attrs, data):
        """
        Used in _save_quiz_and_return_response during `POST` to create a `Quiz` instance. 
        """
        return Concept.objects.create(**concept_attrs)


    def put(self, request, concept_id, format=None):
        """
        ## Algo:

        1. If concept does not exist raise `400`
        2. Validate data
        3. If data is invalid raise `400`
        4. Authorize request -> Ensure first version of quiz is created by same user
        5. Preprocess data
        6. Transaction:
            1. Save Concept
            2. Delete previous sections
            3. Add new sections
        7. Return Response
        """
        found = True
        try:
            concept_v1 = Concept.objects.get(pk=concept_id)
        except Concept.DoesNotExist:
            found = False

        if not found:
            return Response({"concept_id_exists": True}, status=status.HTTP_400_BAD_REQUEST)

        #Authorization
        elif concept_v1.created_by.id != request.user.id:
            return Response({"nice_try": True}, status=status.HTTP_403_FORBIDDEN)

        return self._save_concept_and_return_response(request, concept_v1.created_by, self._get_existing_concept_object)


    def _get_existing_concept_object(self, concept_attrs, data):
        """
        Used in _save_concept_and_return_response during `PUT` to get a `Concept` object.
        """
        concept = Concept(**concept_attrs)
        concept.save()
        return concept
        

    def _save_concept_and_return_response(self, request, created_by, get_concept_instance):
        """
        Workhorse private method that saves data from request (either `POST` or `PUT`) into the database and returns
        appopriate HttpResponse
        """
        data=request.data
        data["created_at"] = timezone.now()
        serializer = ConceptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        section_serializers = []
        for section in data['sections']:
            serializer = ConceptSectionSerializer(data=section)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            section_serializers.append(serializer)


        concept_fields = ['name', 'created_at']
        concept_attrs = {}
        for field in concept_fields:
            concept_attrs[field] = data[field]
        concept_attrs['uuid'] = uuid.UUID(data['uuid'])

        audit_attrs = {
            'created_at': data['created_at'],
            'last_modified_at': data['created_at'],
            'created_by': created_by,
            'last_modified_by': request.user
        }
        concept_attrs.update(audit_attrs)
        
        with transaction.atomic():
            concept = get_concept_instance(concept_attrs, data)
            
            concept.conceptsection_set.all().delete()
            for position, serializer in enumerate(section_serializers):
                section_attrs = {
                    'concept_id': concept.uuid,
                    'position': position,
                }
                section_attrs.update(serializer.data)
                section_attrs.update(audit_attrs)
                
                serializer.create(section_attrs)
                

        return Response(data)

