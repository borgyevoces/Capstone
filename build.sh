#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input

# Run migrations but skip the problematic one
python manage.py migrate webapp 0041 --fake-initial 2>/dev/null || python manage.py migrate webapp 0041 --fake 2>/dev/null || true
python manage.py migrate --run-syncdb 2>/dev/null || python manage.py migrate

python manage.py create_default_superuser