from django.contrib import admin
from django.utils.html import format_html
from .models import FoodEstablishment, MenuItem, Feature, Day, Category, Amenity, InvitationCode, OrderNotification


class FoodEstablishmentAdmin(admin.ModelAdmin):

    def image_tag(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width:50px; height:50px; object-fit:cover;" />',
                obj.image.url
            )
        return "-"
    image_tag.short_description = 'Image'

    # ✅ FIXED: 'category' → custom method 'get_categories'
    # ManyToManyField cannot be used directly in list_display or list_filter
    def get_categories(self, obj):
        cats = list(obj.categories.values_list('name', flat=True))
        if obj.other_category:
            cats.append(f"Other: {obj.other_category}")
        return ", ".join(cats) if cats else "-"
    get_categories.short_description = 'Categories'

    list_display = ('name', 'address', 'status', 'get_categories', 'image_tag',)
    search_fields = ('name', 'address',)
    # ✅ FIXED: ManyToManyField 'categories' can be used in list_filter directly
    list_filter = ('categories',)


class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'food_establishment', 'price', 'quantity', 'is_top_seller')
    search_fields = ('name',)
    list_filter = ('quantity', 'is_top_seller',)


@admin.register(InvitationCode)
class InvitationCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'is_used', 'used_by', 'created_at')
    list_filter = ('is_used',)
    search_fields = ('code',)
    readonly_fields = ('used_by',)


@admin.register(OrderNotification)
class OrderNotificationAdmin(admin.ModelAdmin):
    list_display = ('establishment', 'order', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('establishment__name', 'order__id', 'message')
    readonly_fields = ('created_at',)

    def has_add_permission(self, request):
        return False


admin.site.register(FoodEstablishment, FoodEstablishmentAdmin)
admin.site.register(MenuItem, MenuItemAdmin)
admin.site.register(Feature)
admin.site.register(Day)
admin.site.register(Category)
admin.site.register(Amenity)