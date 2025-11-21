# your_app_name/middleware.py

# ... iba pang imports
from django.urls import reverse_lazy

# Assuming this is your middleware class
class YourMiddleware: # Palitan ito ng actual na pangalan ng class
    def __init__(self, get_response):
        self.get_response = get_response
        self.login_url = str(reverse_lazy('user_login_register')) # ITO ANG BAGUHIN MO
        # self.login_url = str(reverse_lazy('login')) # ITO ang luma

    def __call__(self, request):
        # Your middleware logic here
        # ...
        response = self.get_response(request)
        return response