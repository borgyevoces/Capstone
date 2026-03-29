from django.db import migrations, models


class Migration(migrations.Migration):

    # ✅ STEP 1: Replace 'webapp' below with your actual app name if different.
    # ✅ STEP 2: Replace '0001_initial' with the name of your LATEST existing migration.
    #            To find it, look in your app's migrations/ folder and pick the last file.
    #            Example: if your last migration is 0004_some_change.py → use '0004_some_change'
    dependencies = [
        ('webapp', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='ordernotification',
            name='is_deleted',
            field=models.BooleanField(
                default=False,
                help_text='Soft-delete flag. When True, this notification is hidden '
                          'from the owner panel and will never be recreated by '
                          'get_or_create() calls, because the DB row still exists.',
            ),
        ),
        migrations.AddIndex(
            model_name='ordernotification',
            index=models.Index(
                fields=['establishment', 'is_deleted'],
                name='ordernotif_est_deleted_idx',
            ),
        ),
    ]