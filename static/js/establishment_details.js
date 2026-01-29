// =======================================================
// COMPLETE ESTABLISHMENT DETAILS JS - FULLY WORKING
// =======================================================

// Global helper to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.substring(0, name.length + 1) === name + '=') {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
window.getCookie = getCookie;

// =======================================================
// MESSAGE DISMISS FUNCTIONALITY
// =======================================================
window.dismissMessage = function(button) {
    const messageAlert = button.closest('.message-alert');
    messageAlert.classList.add('hiding');
    setTimeout(() => {
        messageAlert.remove();
        const container = document.getElementById('messagesContainer');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }, 300);
};

// =======================================================
// CART BADGE UPDATE
// =======================================================
window.updateCartBadge = function(count) {
    const badge = document.getElementById('cart-count-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
            // Add animation effect
            badge.classList.add('badge-pulse');
            setTimeout(() => badge.classList.remove('badge-pulse'), 600);
        } else {
            badge.style.display = 'none';
        }
    }
};

// =======================================================
// SHOW MESSAGE/NOTIFICATION WITH ACTION BUTTON
// =======================================================
function showMessage(message, type = 'info', actionButton = null) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type, actionButton);
    } else if (typeof window.showNotification === 'function') {
        window.showNotification(message, type, actionButton);
    } else {
        // Fallback: Create custom notification
        showCustomNotification(message, type, actionButton);
    }
}

// =======================================================
// CUSTOM NOTIFICATION (Fallback)
// =======================================================
function showCustomNotification(message, type = 'success', actionButton = null) {
    // Remove existing notification
    const existing = document.querySelector('.custom-cart-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `custom-cart-notification notification-${type}`;

    const icon = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    }[type] || 'fa-info-circle';

    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span class="notification-message">${message}</span>
            ${actionButton ? `<button class="notification-action-btn">${actionButton.text}</button>` : ''}
            <button class="notification-close">&times;</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Add styles if not present
    if (!document.getElementById('custom-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'custom-notification-styles';
        styles.textContent = `
            .custom-cart-notification {
                position: fixed;
                top: 80px;
                right: 20px;
                background: white;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                animation: slideInRight 0.3s ease-out;
                max-width: 400px;
                border-left: 4px solid #28a745;
            }
            .custom-cart-notification.notification-error {
                border-left-color: #dc3545;
            }
            .custom-cart-notification.notification-warning {
                border-left-color: #ffc107;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .notification-content i {
                font-size: 20px;
                color: #28a745;
            }
            .notification-error .notification-content i {
                color: #dc3545;
            }
            .notification-warning .notification-content i {
                color: #ffc107;
            }
            .notification-message {
                flex: 1;
                font-size: 14px;
                color: #333;
            }
            .notification-action-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .notification-action-btn:hover {
                background: #0056b3;
                transform: translateY(-1px);
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                color: #999;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
            }
            .notification-close:hover {
                color: #333;
            }
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .badge-pulse {
                animation: pulse 0.6s ease-in-out;
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
        `;
        document.head.appendChild(styles);
    }

    // Handle close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    });

    // Handle action button
    if (actionButton && actionButton.onClick) {
        notification.querySelector('.notification-action-btn').addEventListener('click', () => {
            actionButton.onClick();
            notification.remove();
        });
    }

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// =======================================================
// HANDLE MODAL ADD TO CART - ✅ ENHANCED WITH CART PREVIEW
// =======================================================
window.handleModalAddToCart = function(button) {
    console.log('🛒 Add to Cart button clicked');

    // Get values from modal
    const modalItemId = document.getElementById('modalItemId');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const modalItemTitle = document.getElementById('itemDetailModalTitle');

    if (!modalItemId || !itemQuantityInput) {
        console.error('❌ Modal elements not found');
        showMessage('Error: Unable to add item to cart', 'error');
        return;
    }

    const itemId = modalItemId.value;
    const quantity = parseInt(itemQuantityInput.value) || 1;
    const itemName = modalItemTitle ? modalItemTitle.textContent : 'Item';

    console.log('📦 Item ID:', itemId, 'Quantity:', quantity);

    if (!itemId) {
        showMessage('Error: Item not found', 'error');
        return;
    }

    if (!IS_USER_AUTHENTICATED) {
        showMessage('Please log in to add items to cart', 'warning');
        window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        return;
    }

    // Store original button state
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

    // Prepare form data
    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', itemId);
    formData.append('quantity', quantity);

    console.log('📡 Sending request to:', ADD_TO_CART_URL);

    // Send request
    fetch(ADD_TO_CART_URL, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        console.log('📥 Response status:', response.status);
        if (!response.ok) {
            throw new Error('Server error: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Response data:', data);

        if (data.success) {
            // ✅ Show success notification with "View Cart" button
            showMessage(
                data.message || `${quantity}x ${itemName} added to cart!`,
                'success',
                {
                    text: '🛒 View Cart',
                    onClick: () => {
                        window.location.href = CART_URL || '/cart/';
                    }
                }
            );

            // Update cart badge with animation
            if (typeof updateCartBadge === 'function') {
                updateCartBadge(data.cart_count);
            }

            // Reset quantity and close modal
            if (itemQuantityInput) {
                itemQuantityInput.value = 1;
            }

            // Close modal after short delay
            setTimeout(() => {
                closeItemDetailModal();
            }, 500);

        } else {
            showMessage(data.message || 'Failed to add item to cart.', 'error');
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showMessage('An error occurred while adding to cart: ' + error.message, 'error');
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = originalHTML;
    });
};

// =======================================================
// BUY NOW WITH PAYMONGO GCASH
// =======================================================
window.handleBuyNowGCash = function(buttonElement) {
    console.log('💳 Buy Now button clicked');

    const itemDetailModal = document.getElementById('itemDetailModal');
    const modalItemId = itemDetailModal.querySelector('#modalItemId');
    const quantityInput = itemDetailModal.querySelector('#itemQuantity');
    const itemNameDisplay = itemDetailModal.querySelector('#itemDetailModalTitle');

    const itemId = modalItemId ? modalItemId.value : null;
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    const itemName = itemNameDisplay ? itemNameDisplay.textContent : 'Item';

    if (!itemId || isNaN(quantity) || quantity < 1) {
        showMessage('Error: Invalid item selection or quantity.', 'error');
        return;
    }

    if (!IS_USER_AUTHENTICATED) {
        showMessage('Please log in to purchase items.', 'warning');
        window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        return;
    }

    buttonElement.disabled = true;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Payment Link...';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', itemId);
    formData.append('quantity', quantity);

    fetch('/payment/create-buynow-link/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.checkout_url) {
            showMessage('Redirecting to payment...', 'info');
            setTimeout(() => {
                window.location.href = data.checkout_url;
            }, 1000);
        } else {
            throw new Error(data.message || 'Failed to create payment link');
        }
    })
    .catch(error => {
        console.error('Buy Now Error:', error);
        showMessage('Error: ' + error.message, 'error');
        buttonElement.disabled = false;
        buttonElement.innerHTML = '<i class="fas fa-money-bill"></i> Buy Now';
    });
};

// =======================================================
// REVIEW MODAL FUNCTIONS
// =======================================================
document.addEventListener('DOMContentLoaded', function() {
    const reviewModal = document.getElementById('reviewModal');
    const reviewForm = document.getElementById('reviewForm');
    const modalStars = document.getElementById('modalStars');
    const ratingInput = document.getElementById('ratingInput');
    const commentInput = document.getElementById('commentInput');
    const modalTitle = document.getElementById('reviewModalTitle');
    const addReviewBtn = document.getElementById('openReviewModalBtn');

    window.applyReviewFilter = function(filter) {
        const reviews = document.querySelectorAll('.review');
        const buttons = document.querySelectorAll('.btn-filter-review');

        buttons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-rating="${filter}"]`).classList.add('active');

        reviews.forEach(review => {
            const rating = parseInt(review.dataset.rating);
            if (filter === 'all' || rating === parseInt(filter)) {
                review.style.display = 'block';
            } else {
                review.style.display = 'none';
            }
        });
    };

    function updateStarRating(rating) {
        if (!modalStars) return;
        const stars = modalStars.querySelectorAll('i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }

    window.openReviewModal = function(isEdit = false, reviewData = null) {
        if (isEdit && reviewData) {
            modalTitle.textContent = 'Edit Your Review';
            reviewForm.action = BASE_URL_ROOT + 'edit_review/' + reviewData.id + '/';
            commentInput.value = reviewData.comment;
            updateStarRating(reviewData.rating);
        } else {
            modalTitle.textContent = 'Write a Review';
            reviewForm.action = BASE_URL_ROOT + 'submit_review/';
            commentInput.value = '';
            updateStarRating(0);
        }
        if (reviewModal) reviewModal.style.display = 'block';
    };

    window.closeReviewModal = function() {
        if (reviewModal) reviewModal.style.display = 'none';
        updateStarRating(0);
        if (reviewForm) reviewForm.reset();
    };

    if (modalStars) {
        modalStars.addEventListener('mouseover', e => {
            if (e.target.tagName === 'I') {
                const hoverRating = parseInt(e.target.dataset.rating);
                updateStarRating(hoverRating);
            }
        });

        modalStars.addEventListener('click', e => {
            if (e.target.tagName === 'I') {
                const newRating = parseInt(e.target.dataset.rating);
                if (ratingInput) ratingInput.value = newRating;
                updateStarRating(newRating);
            }
        });

        modalStars.addEventListener('mouseout', () => {
            if (ratingInput) updateStarRating(parseInt(ratingInput.value));
        });
    }

    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', () => openReviewModal(false));
    }

    document.body.addEventListener('click', e => {
        if (e.target.classList.contains('edit-review')) {
            const btn = e.target;
            const reviewData = {
                id: btn.dataset.reviewId,
                rating: parseInt(btn.dataset.rating),
                comment: btn.dataset.comment,
            };
            openReviewModal(true, reviewData);
        }

        if (e.target.classList.contains('delete-review')) {
            const reviewId = e.target.dataset.reviewId;
            if (confirm('⚠️ Are you sure you want to delete your review?')) {
                const deleteForm = document.getElementById('delete-review-form');
                if (deleteForm) {
                    deleteForm.action = BASE_URL_ROOT + 'delete_review/' + reviewId + '/';
                    deleteForm.submit();
                }
            }
        }
    });

    // =======================================================
    // MENU FILTERING
    // =======================================================
    const menuList = document.getElementById('menuList');
    const allMenuItems = menuList ? Array.from(document.querySelectorAll('.menu-item')) : [];

    window.filterMenuItems = function() {
        const searchInput = document.getElementById('menuSearchInput');
        const priceFilter = document.getElementById('priceFilter');
        const bestSellerFilter = document.getElementById('bestSellerFilter');

        if (!searchInput || !priceFilter || !bestSellerFilter) return;

        const searchText = searchInput.value.toLowerCase();
        const priceValue = priceFilter.value;
        const isBestSellerFilterActive = bestSellerFilter.classList.contains('active');
        const itemsToShow = [];

        allMenuItems.forEach(item => {
            const itemName = item.querySelector('.menu-name') ? item.querySelector('.menu-name').textContent.toLowerCase() : '';
            const itemDescription = item.querySelector('.menu-description') ? item.querySelector('.menu-description').textContent.toLowerCase() : '';
            const isTopSeller = item.dataset.isTopSeller === 'true';

            const matchesSearch = itemName.includes(searchText) || itemDescription.includes(searchText);
            const matchesBestSeller = !isBestSellerFilterActive || isTopSeller;

            if (matchesSearch && matchesBestSeller) {
                itemsToShow.push(item);
            }
        });

        if (priceValue === 'highest') {
            itemsToShow.sort((a, b) => parseFloat(b.dataset.price) - parseFloat(a.dataset.price));
        } else if (priceValue === 'lowest') {
            itemsToShow.sort((a, b) => parseFloat(a.dataset.price) - parseFloat(b.dataset.price));
        }

        if (menuList) {
            menuList.innerHTML = '';
            if (itemsToShow.length > 0) {
                itemsToShow.forEach(item => menuList.appendChild(item));
                const noItemsMsg = document.getElementById('noMenuItemsFound');
                if (noItemsMsg) noItemsMsg.style.display = 'none';
            } else {
                const noItemsMsg = document.getElementById('noMenuItemsFound');
                if (noItemsMsg) noItemsMsg.style.display = 'block';
            }
        }
    };

    window.toggleBestSellerFilter = function() {
        const button = document.getElementById('bestSellerFilter');
        if (button) {
            button.classList.toggle('active');
            button.setAttribute('aria-pressed', button.classList.contains('active'));
            filterMenuItems();
        }
    };

    // =======================================================
    // ITEM DETAIL MODAL
    // =======================================================
    window.openItemDetailModal = function(menuItemElement) {
        console.log('🔍 Opening item detail modal');

        const itemId = menuItemElement.dataset.itemId;
        const itemName = menuItemElement.dataset.itemName;
        const itemPrice = menuItemElement.dataset.price;
        const itemDescription = menuItemElement.dataset.itemDescription;
        const itemImageUrl = menuItemElement.dataset.itemImageUrl;
        const itemQuantity = parseInt(menuItemElement.dataset.itemQuantity) || 0;

        console.log('Item details:', { itemId, itemName, itemPrice, itemQuantity });

        const modalItemId = document.getElementById('modalItemId');
        const modalItemTitle = document.getElementById('itemDetailModalTitle');
        const modalItemImage = document.getElementById('modalItemImage');
        const modalItemPrice = document.getElementById('modalItemPrice');
        const modalItemDescription = document.getElementById('modalItemDescription');
        const itemQuantityInput = document.getElementById('itemQuantity');

        if (modalItemId) modalItemId.value = itemId;
        if (modalItemTitle) modalItemTitle.textContent = itemName;
        if (modalItemImage) modalItemImage.src = itemImageUrl;
        if (modalItemPrice) modalItemPrice.textContent = '₱ ' + parseFloat(itemPrice).toFixed(2);
        if (modalItemDescription) modalItemDescription.textContent = itemDescription;
        if (itemQuantityInput) itemQuantityInput.value = 1;

        const stockDisplay = document.getElementById('modalItemStock');
        if (stockDisplay) {
            if (itemQuantity > 0) {
                stockDisplay.innerText = itemQuantity + (itemQuantity === 1 ? ' Item' : ' Items');
                stockDisplay.style.color = '#28a745';
            } else {
                stockDisplay.innerText = 'Out of Stock';
                stockDisplay.style.color = '#dc3545';
            }
        }

        const addToCartBtn = document.getElementById('modalAddToCartBtn');
        const buyNowBtn = document.getElementById('modalBuyNowBtn');

        if (itemQuantity <= 0) {
            if (addToCartBtn) {
                addToCartBtn.disabled = true;
                addToCartBtn.style.opacity = '0.5';
            }
            if (buyNowBtn) {
                buyNowBtn.disabled = true;
                buyNowBtn.style.opacity = '0.5';
            }
        } else {
            if (addToCartBtn) {
                addToCartBtn.disabled = false;
                addToCartBtn.style.opacity = '1';
            }
            if (buyNowBtn) {
                buyNowBtn.disabled = false;
                buyNowBtn.style.opacity = '1';
            }
        }

        const itemDetailModal = document.getElementById('itemDetailModal');
        if (itemDetailModal) {
            itemDetailModal.style.display = 'block';
            console.log('✅ Modal opened');
        }
    };

    window.closeItemDetailModal = function() {
        const itemDetailModal = document.getElementById('itemDetailModal');
        if (itemDetailModal) {
            itemDetailModal.style.display = 'none';
            console.log('✅ Modal closed');
        }
    };

    window.updateModalQuantity = function(change) {
        const itemQuantityInput = document.getElementById('itemQuantity');
        if (!itemQuantityInput) return;
        let currentQuantity = parseInt(itemQuantityInput.value);
        let newQuantity = currentQuantity + change;
        if (newQuantity < 1) newQuantity = 1;
        itemQuantityInput.value = newQuantity;
    };

    window.onclick = function(event) {
        if (reviewModal && event.target == reviewModal) closeReviewModal();
        const itemDetailModal = document.getElementById('itemDetailModal');
        if (itemDetailModal && event.target == itemDetailModal) closeItemDetailModal();
    };

    applyReviewFilter('all');

    console.log('✅ Establishment details JS loaded successfully');
});