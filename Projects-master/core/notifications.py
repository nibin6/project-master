"""Email notifications for skill request events."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.urls import reverse

logger = logging.getLogger(__name__)


def send_skill_request_email(exchange, request):
    """Notify the listing owner about a saved request; never fail the request."""
    recipient = exchange.provider.email
    if not recipient:
        logger.warning("Skill request %s owner has no registered email address.", exchange.pk)
        return False

    requester = exchange.requester
    requester_name = requester.get_full_name().strip() or requester.get_username()
    listing = exchange.listing
    request_url = request.build_absolute_uri(reverse("request_detail", args=[exchange.pk]))
    subject = f"New Skill Request — {listing.title}"
    body = (
        f"Hello {exchange.provider.get_full_name().strip() or exchange.provider.get_username()},\n\n"
        f"{requester_name} has requested your skill listing:\n\n"
        f"{listing.title}\n"
        f"Skills: {listing.skills}\n\n"
        f"View and respond to the request: {request_url}\n\n"
        "Thank you,\n"
        "Local Service Barter"
    )
    try:
        sent = send_mail(
            subject, body, settings.DEFAULT_FROM_EMAIL, [recipient], fail_silently=False,
        )
    except Exception as error:
        # Keep request creation independent from SMTP while leaving a useful, non-sensitive diagnostic.
        logger.error("Skill request email delivery failed (%s).", type(error).__name__)
        return False
    if sent != 1:
        logger.warning("Skill request email was not accepted by the configured email backend.")
        return False
    return True
