# your_app_name/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static

from . import views

urlpatterns = [
                  # =========================================================
                  # I. CLIENT (CUSTOMER) VIEWS AND FUNCTIONALITY
                  # =========================================================

                  # 1. Main Browsing & Information
                  path('', views.kabsueats_main_view, name='kabsueats_home'),
                  path('food_establishment/<int:establishment_id>/', views.food_establishment_details,
                       name='food_establishment_details'),
                  path('view-directions/<int:establishment_id>/', views.view_directions, name='view_directions'),
                  path('about/', views.about_page, name='kabsueats_about'),

                  # 2. User Authentication & Profile
                  path('accounts/login/', views.user_login_register, name='user_login'),
                  path('accounts/login_register/', views.user_login_register, name='user_login_register'),
                  path('accounts/logout/', views.user_logout, name='user_logout'),
                  path('accounts/google_login/', views.google_login, name='google_login'),
                  path('accounts/google/callback/', views.google_callback, name='google_callback'),
                  path('update_profile/', views.update_profile, name='update_profile'),

                  path('api/send-registration-otp/', views.send_registration_otp, name='send_registration_otp'),
                  path('api/verify-otp-register/', views.verify_otp_and_register, name='verify_otp_register'),
                  path('api/resend-otp/', views.resend_otp, name='resend_otp'),
                  path('api/verify-otp/', views.verify_otp_only, name='verify_otp_only'),

                  # 3. Password Reset
                  path('accounts/forgot_password/', views.forgot_password, name='forgot_password'),
                  path('accounts/password_reset/',
                       auth_views.PasswordResetView.as_view(template_name='webapplication/password_reset_form.html'),
                       name='password_reset'),
                  path('accounts/password_reset/done/', auth_views.PasswordResetDoneView.as_view(
                      template_name='webapplication/password_reset_done.html'), name='password_reset_done'),
                  path('accounts/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
                      template_name='webapplication/password_reset_confirm.html'), name='password_reset_confirm'),
                  path('accounts/reset/done/', auth_views.PasswordResetCompleteView.as_view(
                      template_name='webapplication/password_reset_complete.html'), name='password_reset_complete'),
                  path('accounts/password_reset_done_redirect/', views.password_reset_done_redirect,
                       name='password_reset_done_redirect'),
                  path('accounts/reset/done/', views.password_reset_complete_redirect, name='password_reset_complete'),

                  # 4. Cart & Payments - COMPLETE FIXED ROUTES
                  path('cart/', views.view_cart, name='view_cart'),
                  path('cart/add/', views.add_to_cart, name='add_to_cart'),
                  path('cart/clear/', views.clear_cart, name='clear_cart'),
                  path('cart/update/', views.update_cart_item, name='update_cart_item'),
                  path('cart/remove/', views.remove_from_cart, name='remove_from_cart'),
                  path('cart/count/', views.get_cart_count, name='get_cart_count'),
                  path('cart/clear-establishment/', views.clear_establishment_cart, name='clear_establishment_cart'),

                  # Payment Routes
                  path('payment/create-gcash-link/', views.create_gcash_payment_link, name='create_gcash_payment_link'),
                  path('payment/gcash-success/', views.gcash_payment_success, name='gcash_payment_success'),
                  path('payment/gcash-cancel/', views.gcash_payment_cancel, name='gcash_payment_cancel'),
                  path('payment/debug-create-payload/<int:order_id>/', views.debug_create_gcash_payload, name='debug_create_gcash_payload'),
                  path('payment/webhook/', views.paymongo_webhook, name='paymongo_webhook'),
                  path('paymongo_checkout/', views.paymongo_checkout, name='paymongo_checkout'),
                  path('payment-status/<str:status>/', views.payment_status, name='payment_status'),
                  path('create-buynow-payment/', views.create_buynow_payment_link, name='create_buynow_payment'),

                  # ✅ FIXED: Notification API Endpoints (removed duplicates)
                  path('api/notifications/', views.get_notifications, name='get_notifications'),
                  path('api/notifications/<int:notification_id>/mark-read/', views.mark_notification_read, name='mark_notification_read'),
                  path('api/notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
                  path('api/test-notification/', views.create_test_notification, name='create_test_notification'),
                  path('api/best-sellers/', views.get_best_sellers, name='get_best_sellers'),

                  # Order Confirmation
                  path('order/confirmation/<int:order_id>/', views.order_confirmation_view, name='order_confirmation'),

                  # Owner Side
                  path('api/food-establishment/orders/',views.get_establishment_orders,name='api_establishment_orders'),
                  path('api/food-establishment/orders/<int:order_id>/update-status/', views.update_order_status, name='api_update_order_status'),
                  path('api/food-establishment/orders/<int:order_id>/details/', views.get_order_details_establishment, name='api_order_details_establishment'),
                  path('owner/orders/', views.food_establishment_orders_view, name='orders_list'),
                  path('owner/transactions/',views.food_establishment_transaction_history, name='establishment_transaction_history'),
                  path('api/establishment/transactions/', views.get_establishment_transactions,  name='get_establishment_transactions'),
                  path('api/establishment/transaction-stats/', views.get_establishment_transaction_statistics,  name='get_establishment_transaction_stats'),
                  path('payment/create-cash-order/', views.create_cash_order, name='create_cash_order'),
                  path('payment/success/',views.payment_success, name='payment_success'),
                  path('payment/paymongo/success/', views.paymongo_payment_success, name='paymongo_payment_success'),
                  path('debug/order/<int:order_id>/', views.debug_order_status, name='debug_order'),
                  path('api/establishment/profile/', views.get_establishment_profile, name='get_establishment_profile'),

                  #Client Side
                  path('my-purchases/', views.order_history_view, name='order_history'),
                  path('api/user/transactions/', views.get_user_transaction_history, name='user_transactions'),
                  path('api/reorder/<int:order_id>/', views.reorder_items, name='reorder_items'),
                  path('api/order/<int:order_id>/', views.get_order_details, name='get_order_details'),

                  # 5. Review Submission & Management
                  path('food_establishment/<int:establishment_id>/submit_review/', views.submit_review,
                       name='submit_review'),
                  path('food_establishment/<int:establishment_id>/edit_review/<int:review_id>/', views.edit_review,
                       name='edit_review'),
                  path('food_establishment/<int:establishment_id>/delete_review/<int:review_id>/', views.delete_review,
                       name='delete_review'),

                  # =========================================================
                  # II. BUSINESS OWNER VIEWS AND FUNCTIONALITY
                  # =========================================================

                  # 6. Owner Management
                  path('food_establishment/reviews/', views.store_reviews_view, name='store_reviews'),
                  path('toggle-top-seller/<int:item_id>/', views.toggle_top_seller, name='toggle_top_seller'),
                  path('menu-item/<int:item_id>/toggle-availability/', views.toggle_item_availability,
                       name='toggle_item_availability'),

                  # 7. Menu Item CRUD
                  path('owner/dashboard/edit_menu_item/<int:item_id>/', views.edit_menu_item, name='edit_menu_item'),
                  path('owner/dashboard/delete_menu_item/<int:item_id>/', views.delete_menu_item,
                       name='delete_menu_item'),

                  # 8. Owner Authentication & Dashboard
                  path('owner/login/', views.owner_login, name='owner_login'),
                  path('owner/logout/', views.owner_logout, name='logout_owner'),
                  path('owner/delete-establishment/', views.delete_establishment, name='delete_establishment'),
                  path('api/verify-and-register/', views.verify_and_register, name='verify_and_register'),
                  path('owner/register/location/', views.owner_register_step1_location, name='owner_register_step1'),
                  path('owner/register/details/', views.owner_register_step2_details, name='owner_register_step2'),
                  path('owner/register/credentials/', views.owner_register_step3_credentials,
                       name='owner_register_step3'),
                  path('api/send-otp/', views.send_otp, name='send_otp'),
                  path('food_establishment/dashboard/', views.food_establishment_dashboard,
                       name='food_establishment_dashboard'),
                  path('dashboard/update-details/<int:pk>/ajax/', views.update_establishment_details_ajax,
                       name='update_establishment_details_ajax'),

                  # OLD GCash Routes (Keep for compatibility but not used)
                  path('gcash/payment-request/', views.gcash_payment_request, name='gcash_payment_request'),
                  path('gcash/confirm-payment/', views.confirm_gcash_payment, name='confirm_gcash_payment'),
                  path('order/confirmation/<int:order_id>/', views.view_order_confirmation,
                       name='view_order_confirmation'),

                  # Chat URLs
                  path('chat/customer/<int:establishment_id>/',views.customer_chat_view, name='customer_chat'),
                  path('chat/owner/<int:customer_id>/', views.owner_chat_view, name='owner_chat'),
                  path('chat/inbox/',views.owner_inbox_view,name='owner_inbox'),
                  path('chat/messages/<int:customer_id>/<int:establishment_id>/',views.get_chat_messages,
                       name='get_chat_messages'),
                  path('owner/chat/conversations/<int:establishment_id>/',views.get_owner_conversations,name='get_owner_conversations'),
                  path('owner/chat/messages/<int:customer_id>/<int:establishment_id>/',views.get_chat_messages_api,name='get_chat_messages_api'),
                  path('api/test-email-config/', views.test_email_config, name='test_email_config'),
              ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)