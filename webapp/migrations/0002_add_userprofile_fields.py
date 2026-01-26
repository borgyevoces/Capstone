# ========================================================================
# CRITICAL: This migration adds ALL missing UserProfile fields
# ========================================================================
#
# INSTRUCTIONS:
# 1. Find your LATEST migration file in webapp/migrations/
#    Look for the HIGHEST number (e.g., 0001, 0002, 0003)
# 2. Name THIS file: 000X_add_userprofile_fields.py
#    where X = your highest number + 1
# 3. Update the dependencies below to match your latest migration
#
# Example: If your latest is 0003_auto_20250115.py, then:
#   - Name this file: 0004_add_userprofile_fields.py
#   - Change dependencies to: ('webapp', '0003_auto_20250115'),
# ========================================================================

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        # ⚠️⚠️⚠️ CRITICAL: CHANGE THIS LINE! ⚠️⚠️⚠️
        # Replace '0001_initial' with YOUR actual latest migration
        # To find it: Look in webapp/migrations/ folder for the highest numbered file
        ('webapp', '0001_initial'),  # ← CHANGE THIS!
    ]

    operations = [
        # Add phone_number field (if not exists)
        migrations.AddField(
            model_name='userprofile',
            name='phone_number',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),

        # Add address field (CURRENTLY MISSING - CAUSING ERROR)
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