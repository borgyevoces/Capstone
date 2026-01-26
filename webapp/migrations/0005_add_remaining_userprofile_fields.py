# Alternative migration - Use this ONLY if you already deployed phone_number migration
# Save this file as: webapp/migrations/0005_add_remaining_userprofile_fields.py

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('webapp', '0004_add_userprofile_phone_number'),  # ← This assumes you already added phone_number
    ]

    operations = [
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