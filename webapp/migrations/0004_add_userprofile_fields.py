# Generated migration to add ALL missing UserProfile fields
# Save this file as: webapp/migrations/0004_add_userprofile_fields.py
# (Change the number to match your latest migration + 1)

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        # ⚠️ IMPORTANT: Change this to match your actual latest migration file
        # Example: if your last migration is 0003_auto_20250115.py, use:
        # ('webapp', '0003_auto_20250115'),
        ('webapp', '0001_initial'),  # ← CHANGE THIS LINE to your latest migration!
    ]

    operations = [
        # Add phone_number field
        migrations.AddField(
            model_name='userprofile',
            name='phone_number',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),

        # Add address field
        migrations.AddField(
            model_name='userprofile',
            name='address',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),

        # Add profile_picture field
        migrations.AddField(
            model_name='userprofile',
            name='profile_picture',
            field=models.ImageField(blank=True, null=True, upload_to='profile_pics/'),
        ),

        # Add bio field
        migrations.AddField(
            model_name='userprofile',
            name='bio',
            field=models.TextField(blank=True, null=True),
        ),
    ]