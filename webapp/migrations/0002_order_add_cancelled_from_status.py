# ============================================================
# MIGRATION: Add cancelled_from_status to Order model
# ------------------------------------------------------------
# HOW TO USE:
#   1. Find your latest migration file inside your app's
#      migrations/ folder (e.g. webapplication/migrations/).
#      It will be something like 0012_....py
#   2. Rename THIS file to the NEXT number, e.g.:
#         0013_order_add_cancelled_from_status.py
#   3. Change the `dependencies` line below to point to YOUR
#      latest migration, e.g.:
#         ('webapplication', '0012_order_cancel_reason'),
#   4. Copy the renamed file into your migrations/ folder.
#   5. Run:  python manage.py migrate
# ============================================================

from django.db import migrations, models


class Migration(migrations.Migration):

    # ⚠️  UPDATE THIS to match your app name and latest migration filename
    dependencies = [
        ('webapp', '0001_initial'),   # <-- CHANGE THIS
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='cancelled_from_status',
            field=models.CharField(
                blank=True,
                default='',
                max_length=20,
                help_text='Status the order was in when the owner rejected it (request/to_pay/to_claim).',
            ),
        ),
    ]