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
    search_fields = ('name', 'food_establishment__name')
    list_filter = ('quantity', 'is_top_seller', 'food_establishment')
    actions = ['mark_as_top_seller', 'unmark_as_top_seller']

    def mark_as_top_seller(self, request, queryset):
        """Mark selected items as top sellers"""
        from django.utils import timezone
        updated = 0
        for item in queryset:
            item.is_top_seller = True
            item.top_seller_marked_at = timezone.now()
            item.save()
            updated += 1
        self.message_user(request, f'{updated} items marked as top sellers')

    mark_as_top_seller.short_description = "✅ Mark as top seller"

    def unmark_as_top_seller(self, request, queryset):
        """Remove top seller flag"""
        updated = queryset.update(
            is_top_seller=False,
            top_seller_marked_at=None
        )
        self.message_user(request, f'{updated} items unmarked')

    unmark_as_top_seller.short_description = "❌ Remove top seller flag"


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