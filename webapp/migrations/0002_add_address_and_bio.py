# ==============================================================================
# CORRECT MIGRATION - Fixed dependency issue
# ==============================================================================
#
# Save this as: webapp/migrations/0002_add_address_and_bio.py
#
# This migration adds ONLY:
# - address (MISSING)
# - bio (MISSING)
#
# It SKIPS phone_number and profile_picture (already exist in database)
# ==============================================================================

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('webapp', '0001_initial'),  # ✅ CORRECT - points to 0001_initial
    ]

    operations = [
        # ✅ ADD: address field (MISSING)
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