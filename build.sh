#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input

# Fake the problematic migration
python manage.py migrate webapp 0041 --fake

# Run all other migrations
python manage.py migrate

python manage.py create_default_superuser