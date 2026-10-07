from .models import Profile


def current_profile(request):
    if not request.user.is_authenticated:
        return {"current_profile": None}
    return {"current_profile": Profile.objects.filter(user=request.user).first()}
