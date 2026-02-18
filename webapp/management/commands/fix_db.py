from django.core.management.base import BaseCommand
from django.db import connection, OperationalError


class Command(BaseCommand):
    help = 'Manually apply missing database columns for categories update'

    def handle(self, *args, **kwargs):
        self.stdout.write("🔧 Applying manual database fixes...")

        try:
            with connection.cursor() as cursor:

                # ✅ 1. Add other_category column
                try:
                    cursor.execute("""
                        ALTER TABLE webapp_foodestablishment
                        ADD COLUMN other_category VARCHAR(200);
                    """)
                    self.stdout.write(self.style.SUCCESS("✅ Added column: other_category"))
                except Exception as e:
                    if 'already exists' in str(e):
                        self.stdout.write("⏭️  Column other_category already exists, skipping.")
                    else:
                        self.stdout.write(self.style.ERROR(f"❌ other_category error: {e}"))

                # ✅ 2. Add other_amenity column
                try:
                    cursor.execute("""
                        ALTER TABLE webapp_foodestablishment
                        ADD COLUMN other_amenity VARCHAR(200);
                    """)
                    self.stdout.write(self.style.SUCCESS("✅ Added column: other_amenity"))
                except Exception as e:
                    if 'already exists' in str(e):
                        self.stdout.write("⏭️  Column other_amenity already exists, skipping.")
                    else:
                        self.stdout.write(self.style.ERROR(f"❌ other_amenity error: {e}"))

                # ✅ 3. Create categories ManyToMany table if not exists
                try:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS webapp_foodestablishment_categories (
                            id SERIAL PRIMARY KEY,
                            foodestablishment_id INTEGER NOT NULL REFERENCES webapp_foodestablishment(id) ON DELETE CASCADE,
                            category_id INTEGER NOT NULL REFERENCES webapp_category(id) ON DELETE CASCADE,
                            UNIQUE (foodestablishment_id, category_id)
                        );
                    """)
                    self.stdout.write(self.style.SUCCESS("✅ Created table: webapp_foodestablishment_categories"))
                except Exception as e:
                    if 'already exists' in str(e):
                        self.stdout.write("⏭️  Table webapp_foodestablishment_categories already exists, skipping.")
                    else:
                        self.stdout.write(self.style.ERROR(f"❌ categories table error: {e}"))

                # ✅ 4. Record in django_migrations so migrate won't conflict
                try:
                    cursor.execute("""
                        INSERT INTO django_migrations (app, name, applied)
                        SELECT 'webapp', '0999_manual_fix_categories', NOW()
                        WHERE NOT EXISTS (
                            SELECT 1 FROM django_migrations
                            WHERE app = 'webapp' AND name = '0999_manual_fix_categories'
                        );
                    """)
                    self.stdout.write(self.style.SUCCESS("✅ Recorded in django_migrations"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"❌ Migration record error: {e}"))

            self.stdout.write(self.style.SUCCESS("\n🎉 Manual fix complete!"))

        except OperationalError as e:
            self.stdout.write(self.style.WARNING(
                f"⚠️  Skipping DB fixes (database not available at build time): {e}"
            ))