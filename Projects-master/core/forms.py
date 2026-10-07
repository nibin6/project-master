from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import ServiceListing, Profile, ExchangeRequest, Rating, Message


class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ["username", "email", "password1", "password2"]


class ProfileForm(forms.ModelForm):
    display_name = forms.CharField(max_length=150, required=False)
    profile_photo = forms.ImageField(required=False, label="Upload Profile Photo", widget=forms.ClearableFileInput(attrs={
        "accept": ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
        "data-photo-preview": "profile-photo-preview",
        "data-photo-error": "profile-photo-error",
    }))

    class Meta:
        model = Profile
        fields = [
            "bio", "location", "experience_level", "availability",
            "skills_offered", "skills_needed", "display_name",
        ]
        widgets = {
            "bio": forms.Textarea(attrs={"rows": 3}),
            "skills_offered": forms.TextInput(attrs={"placeholder": "guitar, cooking, python"}),
            "skills_needed": forms.TextInput(attrs={"placeholder": "plumbing, spanish, resume review"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            css_class = "form-select" if isinstance(field.widget, forms.Select) else "form-control"
            field.widget.attrs["class"] = " ".join(filter(None, (field.widget.attrs.get("class"), css_class)))

    def clean_profile_photo(self):
        photo = self.cleaned_data.get("profile_photo")
        if photo and photo.size > 5 * 1024 * 1024:
            raise forms.ValidationError("Image size is too large. Choose an image under 5 MB.")
        return photo


class ServiceListingForm(forms.ModelForm):
    class Meta:
        model = ServiceListing
        fields = ["title", "description", "category", "skills", "duration_hours", "location"]
        widgets = {"description": forms.Textarea(attrs={"rows": 4})}


class ExchangeRequestForm(forms.ModelForm):
    class Meta:
        model = ExchangeRequest
        fields = ["message"]
        widgets = {"message": forms.Textarea(attrs={"rows": 3, "placeholder": "Say hi, propose a time..."})}


class DirectExchangeForm(forms.Form):
    offered_skill = forms.ChoiceField(label="What can you offer in exchange?")
    requested_skill = forms.ChoiceField(label="What do you want to learn?")
    message = forms.CharField(
        required=False, label="Message",
        widget=forms.Textarea(attrs={"rows": 3, "placeholder": "Add a note for the other member…"}),
    )

    def __init__(self, *args, offered_skills=(), requested_skills=(), **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["offered_skill"].choices = [(skill, skill) for skill in offered_skills]
        self.fields["requested_skill"].choices = [(skill, skill) for skill in requested_skills]
        self.fields["offered_skill"].widget.attrs["class"] = "form-select"
        self.fields["requested_skill"].widget.attrs["class"] = "form-select"
        self.fields["message"].widget.attrs["class"] = "form-control"


class RatingForm(forms.ModelForm):
    class Meta:
        model = Rating
        fields = ["stars", "review"]
        widgets = {
            "stars": forms.Select(choices=[(i, f"{i} star{'s' if i != 1 else ''}") for i in range(1, 6)]),
            "review": forms.Textarea(attrs={"rows": 2}),
        }

    def clean_stars(self):
        stars = self.cleaned_data["stars"]
        if stars not in range(1, 6):
            raise forms.ValidationError("Choose a rating from 1 to 5 stars.")
        return stars


class MessageForm(forms.ModelForm):
    text = forms.CharField(max_length=2000, strip=True, widget=forms.TextInput(attrs={
        "placeholder": "Type a message...", "maxlength": 2000, "class": "form-control",
    }))

    class Meta:
        model = Message
        fields = ["text"]
        widgets = {"text": forms.TextInput(attrs={"placeholder": "Type a message..."})}
