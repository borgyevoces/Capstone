"""
Django Management Command: Fix Best Sellers (No Shell Required)

Place this file in: webapplication/management/commands/fix_bestsellers.py

Then run: python manage.py fix_bestsellers
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from webapplication.models import FoodEstablishment, MenuItem
from django.db.models import Sum, Q
from django.db.models.functions import Coalesce


class Command(BaseCommand):
    help = 'Approve establishments and mark top sellers - NO SHELL REQUIRED'

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.NOTICE('🔧 FIXING BEST SELLERS DISPLAY ISSUE'))
        self.stdout.write("=" * 70)

        # ============================================
        # STEP 1: Check Current State
        # ============================================
        self.stdout.write("\n📊 STEP 1: Checking current state...")

        total_establishments = FoodEstablishment.objects.count()
        approved_count = FoodEstablishment.objects.filter(is_approved=True).count()
        total_items = MenuItem.objects.count()
        items_in_stock = MenuItem.objects.filter(quantity__gt=0).count()
        top_sellers = MenuItem.objects.filter(is_top_seller=True).count()

        self.stdout.write(f"   Total Establishments: {total_establishments}")
        self.stdout.write(f"   Approved Establishments: {approved_count}")
        self.stdout.write(f"   Total Menu Items: {total_items}")
        self.stdout.write(f"   Items in Stock: {items_in_stock}")
        self.stdout.write(f"   Marked as Top Sellers: {top_sellers}")

        # ============================================
        # STEP 2: Approve All Establishments
        # ============================================
        self.stdout.write("\n✅ STEP 2: Approving all establishments...")

        if total_establishments == 0:
            self.stdout.write(self.style.ERROR("   ✗ No establishments found!"))
            self.stdout.write("   Please add establishments first in the admin panel.")
            return

        if approved_count < total_establishments:
            updated = FoodEstablishment.objects.filter(is_approved=False).update(is_approved=True)
            self.stdout.write(self.style.SUCCESS(f"   ✓ Approved {updated} establishments"))
        else:
            self.stdout.write(self.style.SUCCESS("   ✓ All establishments already approved"))

        # ============================================
        # STEP 3: Set Stock for Items with 0 quantity
        # ============================================
        self.stdout.write("\n📦 STEP 3: Setting stock for items...")

        if items_in_stock == 0:
            self.stdout.write("   No items have stock, setting default quantity...")
            updated = MenuItem.objects.filter(quantity=0).update(quantity=10)
            self.stdout.write(self.style.SUCCESS(f"   ✓ Set quantity=10 for {updated} items"))
            items_in_stock = updated
        else:
            self.stdout.write(self.style.SUCCESS(f"   ✓ {items_in_stock} items already have stock"))

        # ============================================
        # STEP 4: Mark Top Sellers
        # ============================================
        self.stdout.write("\n⭐ STEP 4: Marking top sellers...")

        if items_in_stock == 0:
            self.stdout.write(self.style.ERROR("   ✗ No items available to mark as top sellers"))
            return

        # Get items with order counts
        items_with_orders = MenuItem.objects.filter(
            food_establishment__is_approved=True,
            quantity__gt=0
        ).annotate(
            total_orders=Coalesce(
                Sum('orderitem__quantity', filter=Q(orderitem__order__status='Completed')),
                0
            )
        ).order_by('-total_orders', '-created_at')[:30]

        marked_count = 0
        now = timezone.now()

        self.stdout.write(f"\n   Marking items as top sellers:")
        self.stdout.write("   " + "-" * 66)

        for item in items_with_orders:
            item.is_top_seller = True
            item.top_seller_marked_at = now
            item.save()
            marked_count += 1

            orders = getattr(item, 'total_orders', 0)
            self.stdout.write(f"   ✓ {item.name[:40]:40} | {orders:3} orders | {item.food_establishment.name[:20]:20}")

        self.stdout.write("   " + "-" * 66)
        self.stdout.write(self.style.SUCCESS(f"\n   ✓ Marked {marked_count} items as top sellers"))

        # ============================================
        # STEP 5: Final Summary
        # ============================================
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS('✅ DONE! Best Sellers are now configured'))
        self.stdout.write("=" * 70)

        final_approved = FoodEstablishment.objects.filter(is_approved=True).count()
        final_top_sellers = MenuItem.objects.filter(is_top_seller=True).count()

        self.stdout.write(f"\n📊 FINAL STATE:")
        self.stdout.write(f"   Approved Establishments: {final_approved}")
        self.stdout.write(f"   Marked Top Sellers: {final_top_sellers}")

        self.stdout.write(f"\n🔍 NEXT STEPS:")
        self.stdout.write("   1. Visit /api/best-sellers/ to verify API is working")
        self.stdout.write("   2. Refresh your homepage (Ctrl+Shift+R)")
        self.stdout.write("   3. Best Sellers should now display!")

        self.stdout.write("\n" + "=" * 70 + "\n")