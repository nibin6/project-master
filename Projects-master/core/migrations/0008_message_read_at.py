from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_exchange_completion_confirmations"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="read_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
