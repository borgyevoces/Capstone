# ==============================================================================
# FINAL CORRECT MIGRATION - Only adds fields that are ACTUALLY missing
# ==============================================================================
#
# Save this as: webapp/migrations/0003_add_address_and_bio.py
# (or use the next available number after your latest migration)
#
# This migration ONLY adds:
# - address (MISSING - causing error)
# - bio (MISSING)
#
# It SKIPS:
# - phone_number (already exists)
# - profile_picture (already exists)
# ==============================================================================

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('webapp', '0002_add_remaining_userprofile_fields'),  # ⚠️ CHANGE if different
    ]

    operations = [
        # ✅ ADD: address field (MISSING - causing error)
        migrations.AddField(
            model_name='userprofile',
            name='address',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),

        # ✅ ADD: bio field (MISSING)
        migrations.AddField(
            model_name='userprofile',
            name='bio',
            field=models.TextField(blank=True, null=True),
        ),
    ]