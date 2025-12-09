# webapp/migrations/0002_add_time_fields.py
# Create this file if the original migration fails

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('webapp', '0001_initial'),
    ]

    operations = [
        # Add opening_time with null=True first
        migrations.AddField(
            model_name='foodestablishment',
            name='opening_time',
            field=models.TimeField(null=True, blank=True),
        ),
        # Add closing_time with null=True first
        migrations.AddField(
            model_name='foodestablishment',
            name='closing_time',
            field=models.TimeField(null=True, blank=True),
        ),
    ]