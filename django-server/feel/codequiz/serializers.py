from rest_framework import serializers

from core.serializers import set_model_attrs
from .models import CodeQuiz

class CodeQuizSerializer(serializers.ModelSerializer):

    def create(self, validated_data):
        return CodeQuiz.objects.create(**validated_data)
        
    def update(self, codequiz, validated_data):
        set_model_attrs(codequiz, validated_data)
        codequiz.save()
        return codequiz

    class Meta:
        model = CodeQuiz
        fields = ('id', 'problem_statement', 'bootstrap_code', 'time_limit', 'memory_limit', )


