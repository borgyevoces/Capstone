// =======================================================
// ESTABLISHMENT DETAILS JS - FIXED WITH BUY NOW PAYMONGO
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
            badge.classList.add('badge-pulse');
            setTimeout(() => badge.classList.remove('badge-pulse'), 600);
        } else {
            badge.style.display = 'none';
        }
    }
};

// =======================================================
// SHOW MESSAGE/NOTIFICATION
// =======================================================
function showMessage(message, type = 'info', actionButton = null) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type, actionButton);
    } else if (typeof window.showNotification === 'function') {
        window.showNotification(message, type, actionButton);
    } else {
        showCustomNotification(message, type, actionButton);
    }
}

function showCustomNotification(message, type = 'success', actionButton = null) {
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

    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    });

    if (actionButton && actionButton.onClick) {
        notification.querySelector('.notification-action-btn').addEventListener('click', () => {
            actionButton.onClick();
            notification.remove();
        });
    }

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// =======================================================
// ✅ MODAL ADD TO CART - WITH QUANTITY VALIDATION
// =======================================================
window.handleModalAddToCart = function(button) {
    console.log('🛒 Add to Cart button clicked');

    // Check authentication
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && !IS_USER_AUTHENTICATED) {
        showMessage('Please log in to add items to cart', 'warning');
        setTimeout(() => {
            window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        }, 1500);
        return;
    }

    const modalItemId = document.getElementById('modalItemId');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const modalItemTitle = document.getElementById('itemDetailModalTitle');
    const maxQuantity = parseInt(document.getElementById('modalMaxQuantity').value) || 0;

    if (!modalItemId || !itemQuantityInput) {
        console.error('❌ Modal elements not found');
        showMessage('Error: Unable to add item to cart', 'error');
        return;
    }

    const itemId = modalItemId.value;
    const quantity = parseInt(itemQuantityInput.value) || 1;
    const itemName = modalItemTitle ? modalItemTitle.textContent : 'Item';

    // ✅ VALIDATE QUANTITY AGAINST STOCK
    if (quantity > maxQuantity) {
        showMessage(`Only ${maxQuantity} item(s) available in stock`, 'error');
        return;
    }

    if (quantity < 1) {
        showMessage('Quantity must be at least 1', 'error');
        return;
    }

    console.log('📦 Item ID:', itemId, 'Quantity:', quantity, 'Max:', maxQuantity);

    if (!itemId) {
        showMessage('Error: Item not found', 'error');
        return;
    }

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', itemId);
    formData.append('quantity', quantity);

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
                data.message || `${itemName} added to cart!`,
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
// ✅ BUY NOW - PAYMONGO REDIRECT
// =======================================================
window.handleModalBuyNow = function(button) {
    console.log('⚡ Buy Now button clicked');

    // Check authentication
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && !IS_USER_AUTHENTICATED) {
        showMessage('Please log in to purchase items', 'warning');
        setTimeout(() => {
            window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        }, 1500);
        return;
    }

    const modalItemId = document.getElementById('modalItemId');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const maxQuantity = parseInt(document.getElementById('modalMaxQuantity').value) || 0;

    if (!modalItemId || !itemQuantityInput) {
        console.error('❌ Modal elements not found');
        showMessage('Error: Unable to process purchase', 'error');
        return;
    }

    const itemId = modalItemId.value;
    const quantity = parseInt(itemQuantityInput.value) || 1;

    // ✅ VALIDATE QUANTITY AGAINST STOCK
    if (quantity > maxQuantity) {
        showMessage(`Only ${maxQuantity} item(s) available in stock`, 'error');
        return;
    }

    if (quantity < 1) {
        showMessage('Quantity must be at least 1', 'error');
        return;
    }

    console.log('💳 Processing Buy Now - Item ID:', itemId, 'Quantity:', quantity);

    if (!itemId) {
        showMessage('Error: Item not found', 'error');
        return;
    }

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', itemId);
    formData.append('quantity', quantity);

    // ✅ CALL BUY NOW PAYMENT ENDPOINT
    fetch('/create-buynow-payment/', {
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
                throw new Error('Please log in to complete purchase');
            }
            throw new Error('Payment service error');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.checkout_url) {
            console.log('✅ Payment link created:', data.checkout_url);
            showMessage('Redirecting to PayMongo for payment...', 'info');

            // ✅ REDIRECT TO PAYMONGO CHECKOUT
            setTimeout(() => {
                window.location.href = data.checkout_url;
            }, 1000);
        } else {
            showMessage(data.message || 'Failed to create payment link', 'error');
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    })
    .catch(error => {
        console.error('❌ Error:', error);
        showMessage('Error: ' + error.message, 'error');

        if (error.message.includes('log in')) {
            setTimeout(() => {
                window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
            }, 2000);
        }

        button.disabled = false;
        button.innerHTML = originalHTML;
    });
};

// =======================================================
// ✅ DIRECT ADD TO CART (from menu list)
// =======================================================
window.addToCartFromList = function(menuItemId, button) {
    console.log('🛒 Direct add to cart:', menuItemId);

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
// ✅ ITEM DETAIL MODAL - WITH QUANTITY VALIDATION
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
    const modalMaxQuantity = document.getElementById('modalMaxQuantity');

    if (modalItemId) modalItemId.value = itemId;
    if (modalItemTitle) modalItemTitle.textContent = itemName;
    if (modalItemImage) modalItemImage.src = itemImageUrl;
    if (modalItemPrice) modalItemPrice.textContent = '₱ ' + parseFloat(itemPrice).toFixed(2);
    if (modalItemDescription) modalItemDescription.textContent = itemDescription;
    if (itemQuantityInput) itemQuantityInput.value = 1;
    if (modalMaxQuantity) modalMaxQuantity.value = itemQuantity;

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

    // Reset quantity warning
    const quantityWarning = document.getElementById('quantityWarning');
    if (quantityWarning) {
        quantityWarning.classList.remove('show');
    }
};

// ✅ UPDATE QUANTITY WITH VALIDATION
window.updateModalQuantity = function(change) {
    const itemQuantityInput = document.getElementById('itemQuantity');
    const maxQuantity = parseInt(document.getElementById('modalMaxQuantity').value) || 0;
    const quantityWarning = document.getElementById('quantityWarning');

    if (!itemQuantityInput) return;

    let currentQuantity = parseInt(itemQuantityInput.value) || 1;
    let newQuantity = currentQuantity + change;

    // ✅ ENFORCE MINIMUM AND MAXIMUM LIMITS
    if (newQuantity < 1) {
        newQuantity = 1;
    }

    if (newQuantity > maxQuantity) {
        newQuantity = maxQuantity;
        // Show warning
        if (quantityWarning) {
            quantityWarning.classList.add('show');
            setTimeout(() => {
                quantityWarning.classList.remove('show');
            }, 3000);
        }
    } else {
        // Hide warning
        if (quantityWarning) {
            quantityWarning.classList.remove('show');
        }
    }

    itemQuantityInput.value = newQuantity;
    console.log(`📊 Quantity updated: ${newQuantity} / ${maxQuantity}`);
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