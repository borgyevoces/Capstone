# webapp/migrations/0002_add_time_fields.py
# ✅ FIXED: Check if columns exist before adding

from django.db import migrations, models


def add_time_fields_safely(apps, schema_editor):
    """Add time fields only if they don't exist"""
    from django.db import connection

    with connection.cursor() as cursor:
        # Check if columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='webapp_foodestablishment' 
            AND column_name IN ('opening_time', 'closing_time')
        """)
        existing_columns = {row[0] for row in cursor.fetchall()}

        # Add opening_time if it doesn't exist
        if 'opening_time' not in existing_columns:
            cursor.execute("""
                ALTER TABLE webapp_foodestablishment 
                ADD COLUMN opening_time TIME NULL
            """)

        # Add closing_time if it doesn't exist
        if 'closing_time' not in existing_columns:
            cursor.execute("""
                ALTER TABLE webapp_foodestablishment 
                ADD COLUMN closing_time TIME NULL
            """)


class Migration(migrations.Migration):
    dependencies = [
        ('webapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_time_fields_safely, migrations.RunPython.noop),
    ]