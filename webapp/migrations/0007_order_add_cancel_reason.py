from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('webapp', '0006_merge_20260327_1510'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='cancel_reason',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Reason provided when this order was cancelled.'
            ),
        ),
    ]