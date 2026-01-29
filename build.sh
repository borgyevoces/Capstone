#!/usr/bin/env bash
# exit on error
set -o errexit

# ========================================
# KabsuEats Build Script for Render
# ========================================

echo "🚀 Starting KabsuEats build process..."
echo "================================================"

# Install Python dependencies
echo ""
echo "📦 Step 1: Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Packages installed successfully!"

# Create migrations (important if models changed)
echo ""
echo "📝 Step 2: Creating migration files..."
python manage.py makemigrations
echo "✅ Migration files created!"

# Run database migrations
echo ""
echo "🗄️  Step 3: Applying database migrations..."
python manage.py migrate --noinput
echo "✅ Database migrations applied!"

# Collect static files
echo ""
echo "📁 Step 4: Collecting static files..."
python manage.py collectstatic --noinput
echo "✅ Static files collected!"

echo ""
echo "================================================"
echo "✅ Build complete! KabsuEats is ready to deploy."
echo "================================================"