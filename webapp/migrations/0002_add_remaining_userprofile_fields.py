# ========================================================================
# CORRECT MIGRATION - Only adds fields that DON'T exist yet
# ========================================================================
#
# Save this as: webapp/migrations/0002_add_remaining_userprofile_fields.py
# (or use the next available number after 0001_initial.py)
#
# This migration SKIPS phone_number (already exists) and only adds:
# - address
# - profile_picture
# - bio
# ========================================================================

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('webapp', '0001_initial'),  # ⚠️ CHANGE THIS if your latest isn't 0001_initial
    ]

    operations = [
        # ❌ REMOVED: phone_number (already exists in database)
        # migrations.AddField(
        #     model_name='userprofile',
        #     name='phone_number',
        #     field=models.CharField(blank=True, max_length=20, null=True),
        # ),

        # ✅ ADD: address field (MISSING)
        migrations.AddField(
            model_name='userprofile',
            name='address',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),

        # ✅ ADD: profile_picture field (MISSING)
        migrations.AddField(
            model_name='userprofile',
            name='profile_picture',
            field=models.ImageField(blank=True, null=True, upload_to='profile_pics/'),
        ),

        # ✅ ADD: bio field (MISSING)
        migrations.AddField(
            model_name='userprofile',
            name='bio',
            field=models.TextField(blank=True, null=True),
        ),
    ]