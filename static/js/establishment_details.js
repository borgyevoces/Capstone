// =======================================================
// ESTABLISHMENT DETAILS JS - COMPLETE FIXED VERSION
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
                padding: 8px 16px;
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
// ✅ MODAL ADD TO CART - FIXED VERSION
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

    // ✅ Check if user is authenticated (from global variable)
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && !IS_USER_AUTHENTICATED) {
        showMessage('Please log in to add items to cart', 'warning');
        setTimeout(() => {
            window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        }, 1500);
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

    console.log('📡 Sending request to /cart/add/');

    // Send request
    fetch('/cart/add/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('📥 Response status:', response.status);
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Please log in to add items to cart');
            }
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
                        window.location.href = '/cart/';
                    }
                }
            );

            // Update cart badge with animation
            if (typeof updateCartBadge === 'function') {
                updateCartBadge(data.cart_count);
            }

            // Close modal after successful add
            setTimeout(() => {
                closeItemDetailModal();
            }, 1000);

            // Reset quantity to 1
            if (itemQuantityInput) {
                itemQuantityInput.value = 1;
            }

        } else {
            showMessage(data.message || 'Failed to add item to cart', 'error');
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showMessage('Error: ' + error.message, 'error');

        // Redirect to login if authentication error
        if (error.message.includes('log in')) {
            setTimeout(() => {
                window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
            }, 2000);
        }
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = originalHTML;
    });
};

// =======================================================
// ✅ DIRECT ADD TO CART (from menu list)
// =======================================================
window.addToCartFromList = function(menuItemId, button) {
    console.log('🛒 Direct add to cart:', menuItemId);

    // Check authentication
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && !IS_USER_AUTHENTICATED) {
        showMessage('Please log in to add items to cart', 'warning');
        setTimeout(() => {
            window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        }, 1500);
        return;
    }

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', menuItemId);
    formData.append('quantity', 1);

    fetch('/cart/add/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Please log in to add items to cart');
            }
            throw new Error('Server error');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage(
                data.message || 'Item added to cart!',
                'success',
                {
                    text: '🛒 View Cart',
                    onClick: () => {
                        window.location.href = '/cart/';
                    }
                }
            );

            if (typeof updateCartBadge === 'function') {
                updateCartBadge(data.cart_count);
            }
        } else {
            showMessage(data.message || 'Failed to add item', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error: ' + error.message, 'error');

        if (error.message.includes('log in')) {
            setTimeout(() => {
                window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
            }, 2000);
        }
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = originalHTML;
    });
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

// Close modal on outside click
window.onclick = function(event) {
    const itemDetailModal = document.getElementById('itemDetailModal');
    if (itemDetailModal && event.target == itemDetailModal) {
        closeItemDetailModal();
    }
};

// =======================================================
// INITIALIZE ON PAGE LOAD
// =======================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Establishment details JS loaded successfully');

    // Load cart count on page load
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && IS_USER_AUTHENTICATED) {
        fetch('/cart/count/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && typeof updateCartBadge === 'function') {
                updateCartBadge(data.cart_count);
            }
        })
        .catch(error => console.error('Error loading cart count:', error));
    }
});