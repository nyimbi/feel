# -*- coding: utf-8 -*-
# Generated by Django 1.9 on 2016-01-05 02:03
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('course', '0003_course_how_to_learn'),
    ]

    operations = [
        migrations.AlterField(
            model_name='course',
            name='how_to_learn',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='course',
            name='intro',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='course',
            name='where_to_go_from_here',
            field=models.TextField(blank=True, default=''),
        ),
    ]