from django.contrib import admin
from .models import FoodEstablishment, MenuItem, Feature, Day, Category, Amenity, InvitationCode,OrderNotification

class FoodEstablishmentAdmin(admin.ModelAdmin):
    def image_tag(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width:50px; height:50px; object-fit:cover;" />',
                obj.image.url
            )
        return "-"
    image_tag.short_description = 'Image'
    list_display = ('name', 'address', 'status', 'category', 'image_tag',)
    search_fields = ('name', 'address',)
    list_filter = ('category',)

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
