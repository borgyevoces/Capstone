#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🚀 Starting build process..."

# Install Python dependencies
echo "📦 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Dependencies installed"

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --no-input

echo "✅ Static files collected"

# Run database migrations
echo "🔄 Running migrations..."
python manage.py migrate --noinput

echo "✅ Migrations completed"

# Create superuser using management command (AFTER migrations)
echo "👤 Creating superuser..."
python manage.py create_superuser

echo "✅ Build process complete!"

pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --no-input
