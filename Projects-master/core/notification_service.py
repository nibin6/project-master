from .models import InAppNotification


def notify(recipient, notification_type, message, exchange=None):
    """Create a notification from a server-side application event."""
    if recipient is None:
        return None
    return InAppNotification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        message=message,
        exchange=exchange,
    )
