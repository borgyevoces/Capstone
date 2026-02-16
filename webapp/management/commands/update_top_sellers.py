"""
Django Management Command: Update Top Sellers

This command automatically identifies and marks the most popular menu items
as "top sellers" based on their order history.

Usage:
    python manage.py update_top_sellers

    # Or with custom parameters:
    python manage.py update_top_sellers --limit 30 --min-orders 5

Place this file in: your_app_name/management/commands/update_top_sellers.py
"""

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum, Q, Count
from django.db.models.functions import Coalesce
from django.utils import timezone
from webapplication.models import MenuItem, FoodEstablishment


class Command(BaseCommand):
    help = 'Automatically mark popular menu items as top sellers based on order count'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=20,
            help='Number of items to mark as top sellers (default: 20)'
        )
        parser.add_argument(
            '--min-orders',
            type=int,
            default=1,
            help='Minimum number of orders required to be a top seller (default: 1)'
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset all existing top seller flags before marking new ones'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        min_orders = options['min_orders']
        reset = options['reset']

        self.stdout.write(self.style.NOTICE(f'\n{"="*60}'))
        self.stdout.write(self.style.NOTICE('KabsuEats - Top Sellers Update'))
        self.stdout.write(self.style.NOTICE(f'{"="*60}\n'))

        # Step 1: Reset existing top sellers if requested
        if reset:
            self.stdout.write('Resetting existing top sellers...')
            reset_count = MenuItem.objects.filter(is_top_seller=True).update(
                is_top_seller=False,
                top_seller_marked_at=None
            )
            self.stdout.write(self.style.WARNING(f'✓ Reset {reset_count} existing top sellers\n'))

        # Step 2: Get approved establishments
        # Note: 'status' is a @property method, not a database field
        approved_establishments = FoodEstablishment.objects.filter(
            is_approved=True
        )

        establishments_count = approved_establishments.count()
        self.stdout.write(f'Found {establishments_count} approved establishments')

        if establishments_count == 0:
            self.stdout.write(self.style.ERROR('\n✗ No approved establishments found!'))
            self.stdout.write(self.style.ERROR('Please approve at least one establishment first.'))
            return

        # Step 3: Get items with order counts, grouped by establishment
        self.stdout.write('\nAnalyzing menu items and order history...')

        from collections import defaultdict
        items_by_establishment = defaultdict(list)

        all_items = MenuItem.objects.filter(
            food_establishment__in=approved_establishments
        ).annotate(
            order_count=Coalesce(
                Sum('orderitem__quantity', filter=Q(orderitem__order__status='Completed')),
                0
            ),
            order_transactions=Count(
                'orderitem__order',
                filter=Q(orderitem__order__status='Completed'),
                distinct=True
            )
        ).order_by('-order_count', '-order_transactions', '-created_at')

        # Group items by establishment
        for item in all_items:
            items_by_establishment[item.food_establishment_id].append(item)

        # Step 4: Use ROUND-ROBIN to select items from different establishments
        self.stdout.write(f'\nUsing round-robin distribution to ensure variety...')
        self.stdout.write(f'Marking top {limit} items as best sellers (distributed across establishments)...\n')

        items_to_mark = []
        max_per_establishment = max(2, limit // establishments_count)  # At least 2 per establishment

        # First pass: Get max_per_establishment items from each establishment
        for establishment_id, items in items_by_establishment.items():
            items_to_mark.extend(items[:max_per_establishment])
            if len(items_to_mark) >= limit:
                break

        # Second pass: Round-robin to fill remaining slots
        if len(items_to_mark) < limit:
            establishment_ids = list(items_by_establishment.keys())
            round_robin_idx = 0
            items_taken = defaultdict(int)

            # Initialize with how many we already took
            for item in items_to_mark:
                items_taken[item.food_establishment_id] += 1

            while len(items_to_mark) < limit:
                current_est = establishment_ids[round_robin_idx % len(establishment_ids)]
                items_from_est = items_by_establishment[current_est]
                next_idx = items_taken[current_est]

                if next_idx < len(items_from_est):
                    candidate = items_from_est[next_idx]
                    if candidate not in items_to_mark:
                        items_to_mark.append(candidate)
                        items_taken[current_est] += 1

                round_robin_idx += 1

                # Safety break
                if round_robin_idx > len(establishment_ids) * 100:
                    break

        # Limit to requested number
        items_to_mark = items_to_mark[:limit]

        if not items_to_mark:
            self.stdout.write(self.style.WARNING('\n✗ No items found to mark as top sellers'))
            return

        # Step 5: Mark items as top sellers
        marked_count = 0
        now = timezone.now()

        self.stdout.write(self.style.NOTICE(f'{"ID":<6} {"Item Name":<30} {"Orders":<10} {"Establishment":<25}'))
        self.stdout.write(self.style.NOTICE('-' * 80))

        for item in items_to_mark:
            item.is_top_seller = True
            item.top_seller_marked_at = now
            item.save(update_fields=['is_top_seller', 'top_seller_marked_at'])

            order_count = getattr(item, 'order_count', 0)
            establishment_name = item.food_establishment.name[:24]
            item_name = item.name[:29]

            self.stdout.write(
                f'{item.id:<6} {item_name:<30} {order_count:<10} {establishment_name:<25}'
            )
            marked_count += 1

        # Step 6: Display summary
        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(self.style.SUCCESS(f'✓ Successfully marked {marked_count} items as top sellers'))

        # Show distribution across establishments
        establishment_distribution = {}
        for item in items_to_mark:
            est_name = item.food_establishment.name
            establishment_distribution[est_name] = establishment_distribution.get(est_name, 0) + 1

        self.stdout.write('\nTop Sellers Distribution by Establishment:')
        for est_name, count in sorted(establishment_distribution.items(), key=lambda x: x[1], reverse=True):
            self.stdout.write(f'  • {est_name}: {count} items')

        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(self.style.SUCCESS('Done! View your top sellers at: /api/best-sellers/'))
        self.stdout.write(f'{"="*60}\n')