from django import template
from django.core.exceptions import ObjectDoesNotExist

register = template.Library()


@register.inclusion_tag("core/partials/profile_avatar.html")
def profile_avatar(user, profile=None, size=40):
    if profile is None and getattr(user, "is_authenticated", False):
        try:
            profile = user.profile
        except ObjectDoesNotExist:
            profile = None
    return {
        "avatar_url": profile.profile_picture if profile else "",
        "avatar_size": size,
        "avatar_label": f"{user.get_username()} profile photo",
    }
