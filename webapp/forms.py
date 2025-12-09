# your_app_name/forms.py
from django import forms
from .models import FoodEstablishment, MenuItem , Amenity, InvitationCode, Review

# Form for Invitation Code Validation
class InvitationCodeForm(forms.Form):
    code = forms.CharField(
        label="Invitation Code",
        max_length=12,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter your invitation code'})
    )

    def clean_code(self):
        code = self.cleaned_data.get('code')
        try:
            # Case-insensitive check for the code
            invitation_code = InvitationCode.objects.get(code__iexact=code)
            if invitation_code.is_used:
                raise forms.ValidationError("This invitation code has already been used.")
        except InvitationCode.DoesNotExist:
            raise forms.ValidationError("Invalid invitation code.")
        return code

# Form for creating and editing Food Establishments
class FoodEstablishmentForm(forms.ModelForm):
    image = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={'accept': 'image/*'})
    )
    latitude = forms.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = forms.DecimalField(max_digits=9, decimal_places=6, required=False)
    amenities = forms.ModelMultipleChoiceField(
        queryset=Amenity.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False
    )

    class Meta:
        model = FoodEstablishment
        fields = [
            'name',
            'address',
            'opening_time',
            'closing_time',
            'image',
            'category',
            'payment_methods',
            'latitude',
            'longitude',
            'amenities',
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'category': forms.Select(attrs={'class': 'form-control'}),
            'payment_methods': forms.TextInput(attrs={'class': 'form-control'}),
        }

        labels = {
            'name': ' Establishment name:',

        }
        opening_time = forms.TimeField(
            widget=forms.TimeInput(attrs={'type': 'time', 'class': 'form-control'}),
            required=False,
            label="Opening Time"
        )
        closing_time = forms.TimeField(
            widget=forms.TimeInput(attrs={'type': 'time', 'class': 'form-control'}),
            required=False,
            label="Closing Time"
        )


    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image and image.size > 5 * 1024 * 1024:
            raise forms.ValidationError("Image size should not exceed 5MB.")
        return image

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.latitude = self.cleaned_data['latitude']
        instance.longitude = self.cleaned_data['longitude']
        if commit:
            instance.save()
            self.save_m2m()
        return instance

# Form for updating an existing Food Establishment's details on the dashboard
class FoodEstablishmentUpdateForm(forms.ModelForm):
    image = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={'accept': 'image/*'})
    )

    latitude = forms.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = forms.DecimalField(max_digits=9, decimal_places=6, required=False)

    amenities = forms.ModelMultipleChoiceField(
        queryset=Amenity.objects.all(),
        widget=forms.CheckboxSelectMultiple,
        required=False
    )


    # ✅ Payment methods as MultipleChoiceField with checkboxes
    PAYMENT_CHOICES = [
        ('Cash', 'Cash'),
        ('GCash', 'GCash'),
        ('Credit/Debit Card', 'Credit/Debit Card'),
    ]

    payment_methods = forms.MultipleChoiceField(
        choices=PAYMENT_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False
    )

    opening_time = forms.TimeField(
        widget=forms.TimeInput(attrs={'type': 'time', 'class': 'form-control'}),
        required=False,
        label="Opening Time"
    )
    closing_time = forms.TimeField(
        widget=forms.TimeInput(attrs={'type': 'time', 'class': 'form-control'}),
        required=False,
        label="Closing Time"
    )

    class Meta:
        model = FoodEstablishment
        fields = [
            'name',
            'address',
            'opening_time',
            'closing_time',
            'image',
            'latitude',
            'longitude',
            'category',
            'amenities',
            'payment_methods',
        ]
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'category': forms.Select(attrs={'class': 'form-control'}),
        }

        labels = {
            'name': ' Establishment name:',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            self.initial['latitude'] = self.instance.latitude
            self.initial['longitude'] = self.instance.longitude

            # ✅ NEW: Initialize time fields
            self.initial['opening_time'] = self.instance.opening_time
            self.initial['closing_time'] = self.instance.closing_time

            # ✅ Pre-select payment methods from comma-separated string
            if self.instance.payment_methods:
                selected = [method.strip() for method in self.instance.payment_methods.split(',')]
                self.initial['payment_methods'] = selected

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.latitude = self.cleaned_data['latitude']
        instance.longitude = self.cleaned_data['longitude']

        # ✅ NEW: Save time fields
        instance.opening_time = self.cleaned_data.get('opening_time')
        instance.closing_time = self.cleaned_data.get('closing_time')

        # ✅ Convert selected payment methods list to comma-separated string
        payment_list = self.cleaned_data.get('payment_methods', [])
        instance.payment_methods = ', '.join(payment_list) if payment_list else ''

        if commit:
            instance.save()
            self.save_m2m()
        return instance

# Form for creating and editing Menu Items
class MenuItemForm(forms.ModelForm):
    class Meta:
        model = MenuItem
        fields = [
            'name',
            'description',
            'price',
            'quantity',
            'image',
        ]
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
            'is_available': forms.Select(choices=[(True, 'Available'), (False, 'Out of Stock')]),
            'image': forms.FileInput(attrs={'accept': 'image/*'}),
        }
        labels = {
            'name': ' Menu name:',
            'description': 'Description:',
            'price': 'Price:',
            'quantity': 'Set Quantity:',
            'image': 'Image:',
        }

    def clean_quantity(self):
        qty = self.cleaned_data.get('quantity', 0)
        if qty < 0:
            raise forms.ValidationError("Quantity cannot be negative.")
        return qty

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image and image.size > 5 * 1024 * 1024:
            raise forms.ValidationError("Image size should not exceed 5MB.")
        return image

# NEW: Form for Reviews and Ratings
class ReviewForm(forms.ModelForm):
    class Meta:
        model = Review
        fields = ['rating', 'comment', 'image']
        widgets = {
            'rating': forms.HiddenInput(),
            'comment': forms.Textarea(attrs={'class': 'form-control', 'placeholder': 'Share your experience...'}),
            'image': forms.FileInput(attrs={'class': 'form-control-file'})
        }

# UserProfileUpdateForm

from django import forms
from django.contrib.auth import get_user_model
from .models import UserProfile # I-assume na ito ang profile model mo

User = get_user_model()

class UserProfileUpdateForm(forms.ModelForm):
    # Form para sa pagpapalit ng username at profile picture

    # Custom field para sa User model fields (Username)
    username = forms.CharField(max_length=150, required=True)

    class Meta:
        model = UserProfile
        # Tanging 'profile_picture' lang ang kukunin sa UserProfile model
        fields = ['profile_picture']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # I-set ang initial value ng username mula sa User instance
        if self.instance and self.instance.user:
            self.fields['username'].initial = self.instance.user.username

    def save(self, commit=True):
        profile = super().save(commit=False)
        user = profile.user

        # I-update ang username sa User model
        user.username = self.cleaned_data['username']

        if commit:
            user.save()
            profile.save()
        return profile

# =================================================================
# NEW: Owner Access Code Form
# =================================================================
class AccessCodeForm(forms.Form):
    new_access_code = forms.CharField(
        label="New Access Code", # Ito ang label na makikita sa HTML kung gagamitin ang {{ form.as_p }}
        max_length=50,
        min_length=6,
        required=True,
        widget=forms.TextInput(attrs={
            'placeholder': 'Enter new code',
            'class': 'form-control', # Maaaring gamitin para sa styling
            'style': 'text-transform: uppercase;'
        })
    )

    def clean_new_access_code(self):
        code = self.cleaned_data['new_access_code'].upper()
        # Validation: Tinitiyak na ang code ay kombinasyon lang ng letra at numero.
        if not code.isalnum():
            raise forms.ValidationError("Access Code must be alphanumeric (letters and numbers only).")
        return code

