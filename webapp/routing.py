# webapplication/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/chat/(?P<customer_id>\d+)/(?P<establishment_id>\d+)/$',
        consumers.ChatConsumer.as_asgi()
    ),
    # ✅ Real-time inventory / stock updates per establishment
    re_path(
        r'ws/inventory/(?P<establishment_id>\d+)/$',
        consumers.InventoryConsumer.as_asgi()
    ),
    # ✅ Real-time order status push — owner side (per establishment)
    re_path(
        r'ws/order-status/establishment/(?P<scope_type>establishment)/(?P<scope_id>\d+)/$',
        consumers.OrderStatusConsumer.as_asgi()
    ),
    # ✅ Real-time order status push — customer side (per user)
    re_path(
        r'ws/order-status/user/(?P<scope_type>user)/(?P<scope_id>\d+)/$',
        consumers.OrderStatusConsumer.as_asgi()
    ),
    # ✅ FIXED: ws/orders/<establishment_id>/ — used by the owner dashboard
    #    navbar badge poller (food_establishment_dashboard.html) to get
    #    instant bell-badge updates when any order event fires.
    re_path(
        r'ws/orders/(?P<establishment_id>\d+)/$',
        consumers.OrderStatusConsumer.as_asgi()
    ),
    # ✅ Real-time map updates — establishment creation/update/deletion/deactivation
    re_path(
        r'ws/establishments/$',
        consumers.EstablishmentConsumer.as_asgi()
    ),
    # ✅ NEW: Real-time cart sync per user — quantity updates, remove, clear,
    #    and order-sent events are pushed to all tabs/devices of the same user.
    re_path(
        r'ws/cart/(?P<user_id>\d+)/$',
        consumers.CartConsumer.as_asgi()
    ),
    # ✅ NEW: Realtime owner presence (bidirectional, ~1 second)
    #   Owner:    /ws/presence/<est_id>/owner/
    #             → connects when dashboard opens; disconnect = offline broadcast
    #   Customer: /ws/presence/<est_id>/customer/<customer_id>/
    #             → connects when details page opens; receives owner status
    #             → also broadcasts customer presence to the owner dashboard
    re_path(
        r'ws/presence/(?P<establishment_id>\d+)/owner/$',
        consumers.OwnerPresenceConsumer.as_asgi()
    ),
    re_path(
        r'ws/presence/(?P<establishment_id>\d+)/customer/(?P<customer_id>\d+)/$',
        consumers.OwnerPresenceConsumer.as_asgi()
    ),
]