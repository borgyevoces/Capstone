#!/usr/bin/env bash
# exit on error
set -o errexit

# ========================================
# KabsuEats Build Script for Render
# ========================================

echo "🚀 Starting KabsuEats build process..."

# Install Python dependencies
echo "📦 Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations
echo "🗄️  Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Build complete! KabsuEats is ready to deploy."