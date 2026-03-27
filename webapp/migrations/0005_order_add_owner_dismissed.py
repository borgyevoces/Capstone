from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('webapp', '0003_alter_order_cancelled_from_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='owner_dismissed',
            field=models.BooleanField(
                default=False,
                help_text='Set to True when the owner dismisses a client-cancelled order from the request tab.'
            ),
        ),
    ]