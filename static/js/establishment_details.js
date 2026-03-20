// =======================================================
// ESTABLISHMENT DETAILS JS - COMPLETE WITH BUY NOW PAYMONGO
// =======================================================

// Tracks how many of the open modal item are already in a pending order request
let modalInRequest = 0;

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
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';  // flex for centering
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
// ✅ MODAL BUY NOW — adds to cart then redirects to /cart/
// =======================================================
// =======================================================
// ✅ BUY NOW — adds to cart then redirects to /cart/
// =======================================================
window.handleModalBuyNow = function(button) {
    console.log('⚡ Buy Now button clicked');

    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && !IS_USER_AUTHENTICATED) {
        showMessage('Please log in to make a purchase', 'warning');
        setTimeout(() => { window.location.href = LOGIN_REGISTER_URL || '/accounts/login/'; }, 1500);
        return;
    }

    const modalItemId      = document.getElementById('modalItemId');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const modalItemTitle   = document.getElementById('itemDetailModalTitle');
    const maxQuantity      = parseInt(document.getElementById('modalMaxQuantity').value) || 0;

    if (!modalItemId || !itemQuantityInput) {
        showMessage('Error: Unable to process purchase', 'error');
        return;
    }

    const itemId   = modalItemId.value;
    const quantity = parseInt(itemQuantityInput.value) || 1;
    const itemName = modalItemTitle ? modalItemTitle.textContent.trim() : 'Item';

    if (quantity > maxQuantity) {
        showMessage(`Only ${maxQuantity} item(s) available in stock`, 'error');
        return;
    }
    if (quantity < 1) {
        showMessage('Please select a valid quantity', 'error');
        return;
    }

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

    const csrfToken = getCookie('csrftoken');
    const formData  = new FormData();
    formData.append('menu_item_id', itemId);
    formData.append('quantity', quantity);

    fetch('/cart/add/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to add to cart');
        return response.json();
    })
    .then(data => {
        button.disabled = false;
        button.innerHTML = originalHTML;

        if (!data.success) {
            throw new Error(data.message || 'Failed to add item to cart');
        }

        if (typeof updateCartBadge === 'function') updateCartBadge(data.cart_count);
        showMessage(`${itemName} added! Redirecting to cart...`, 'success');
        setTimeout(() => { window.location.href = '/cart/'; }, 800);
    })
    .catch(error => {
        console.error('❌ Buy Now error:', error);
        showMessage('Error: ' + error.message, 'error');
        button.disabled = false;
        button.innerHTML = originalHTML;
    });
};

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

    if (quantity < 1) {
        showMessage('Please select a valid quantity', 'error');
        return;
    }

    console.log(`🛒 Adding to cart: Item ${itemId}, Quantity ${quantity}`);

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

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
            if (typeof updateCartBadge === 'function') updateCartBadge(data.cart_count);
            window.location.href = '/cart/';
        } else {
            showMessage(data.message || 'Failed to add item', 'error');
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error: ' + error.message, 'error');
        button.disabled = false;
        button.innerHTML = originalHTML;
        if (error.message.includes('log in')) {
            setTimeout(() => {
                window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
            }, 2000);
        }
    });
};

// =======================================================
// ✅ QUICK ADD TO CART (FROM MENU LIST)
// =======================================================
window.handleQuickAddToCart = function(button, event) {
    if (event) {
        event.stopPropagation();
    }

    console.log('🛒 Quick Add to Cart clicked');

    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && !IS_USER_AUTHENTICATED) {
        showMessage('Please log in to add items to cart', 'warning');
        setTimeout(() => {
            window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        }, 1500);
        return;
    }

    const menuItemId = button.dataset.itemId;
    const menuItemName = button.dataset.itemName;

    if (!menuItemId) {
        console.error('❌ No item ID found');
        showMessage('Error: Item not found', 'error');
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
                    onClick: () => { window.location.href = '/cart/'; }
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
// mode: 'cart' | 'buynow' — optional, used to visually highlight the intended action
window.openItemDetailModal = function(menuItemElement, mode) {
    console.log('🔍 Opening item detail modal, mode:', mode);

    const itemId = menuItemElement.dataset.itemId;
    const itemName = menuItemElement.dataset.itemName;
    const itemPrice = menuItemElement.dataset.price;
    const itemDescription = menuItemElement.dataset.itemDescription;
    const itemImageUrl = menuItemElement.dataset.itemImageUrl;
    const itemQuantity = parseInt(menuItemElement.dataset.itemQuantity) || 0;
    const isTopSeller = menuItemElement.dataset.isTopSeller === 'true';

    console.log('Item details:', { itemId, itemName, itemPrice, itemQuantity });

    const modalItemId = document.getElementById('modalItemId');
    const modalItemTitle = document.getElementById('itemDetailModalTitle');
    const modalItemImage = document.getElementById('modalItemImage');
    const modalItemPrice = document.getElementById('modalItemPrice');
    const modalItemDescription = document.getElementById('modalItemDescription');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const modalMaxQuantity = document.getElementById('modalMaxQuantity');
    const bestSellerBadge = document.getElementById('modalBestSellerBadge');

    if (modalItemId) modalItemId.value = itemId;
    if (modalItemTitle) modalItemTitle.textContent = itemName;
    if (modalItemImage) modalItemImage.src = itemImageUrl;
    if (modalItemPrice) modalItemPrice.textContent = '₱' + parseFloat(itemPrice).toFixed(2);
    if (modalItemDescription) modalItemDescription.textContent = itemDescription;
    if (itemQuantityInput) itemQuantityInput.value = 1;
    if (modalMaxQuantity) modalMaxQuantity.value = itemQuantity;

    // Best seller badge
    if (bestSellerBadge) {
        bestSellerBadge.style.display = isTopSeller ? 'flex' : 'none';
    }

    // Stock display
    const stockDisplay = document.getElementById('modalItemStock');
    if (stockDisplay) {
        if (itemQuantity > 0) {
            stockDisplay.innerHTML = `<i class="fas fa-box"></i> ${itemQuantity} Item${itemQuantity !== 1 ? 's' : ''}`;
            stockDisplay.style.color = '#374151';
        } else {
            stockDisplay.innerHTML = `<i class="fas fa-times-circle"></i> Out of Stock`;
            stockDisplay.style.color = '#dc2626';
        }
    }

    // Establishment open/closed status
    const estStatus = document.getElementById('itemModalEstStatus');
    if (estStatus) {
        const now = new Date();
        const hour = now.getHours();
        // Simple check — ideally server-provided; fallback visual
        estStatus.className = 'item-modal-est-status open';
        estStatus.textContent = 'Open';
    }

    const addToCartBtn = document.getElementById('modalAddToCartBtn');
    const buyNowBtn = document.getElementById('modalBuyNowBtn');

    if (itemQuantity <= 0) {
        if (addToCartBtn) { addToCartBtn.disabled = true; addToCartBtn.style.opacity = '0.5'; }
        if (buyNowBtn) { buyNowBtn.disabled = true; buyNowBtn.style.opacity = '0.5'; }
    } else {
        if (addToCartBtn) { addToCartBtn.disabled = false; addToCartBtn.style.opacity = '1'; }
        if (buyNowBtn) { buyNowBtn.disabled = false; buyNowBtn.style.opacity = '1'; }
    }

    const itemDetailModal = document.getElementById('itemDetailModal');
    if (itemDetailModal) {
        itemDetailModal.classList.add('open');
        console.log('✅ Modal opened');
    }

    // ── Reset request info banner ──────────────────────────────────
    const reqInfo     = document.getElementById('modalRequestInfo');
    const reqInfoText = document.getElementById('modalRequestInfoText');
    if (reqInfo) reqInfo.style.display = 'none';

    // ── Fetch existing request qty for this item ───────────────────
    const estId = document.getElementById('modalEstablishmentId')
                    ? document.getElementById('modalEstablishmentId').value
                    : (typeof ESTABLISHMENT_ID !== 'undefined' ? ESTABLISHMENT_ID : null);

    if (estId && typeof IS_USER_AUTHENTICATED !== 'undefined' && IS_USER_AUTHENTICATED) {
        fetch(`/api/request-qtys/?establishment_id=${estId}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin'
        })
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            const inRequest = data.qtys[String(itemId)] || 0;
            modalInRequest = inRequest;
            if (inRequest > 0 && reqInfo && reqInfoText) {
                const remaining = itemQuantity - inRequest;
                const maxInput = document.getElementById('modalMaxQuantity');
                const qtyInput = document.getElementById('itemQuantity');
                if (remaining <= 0) {
                    reqInfoText.textContent =
                        `You already have ${inRequest}x of this item in a pending order request (max stock reached).`;
                    if (maxInput) maxInput.value = 0;
                    if (qtyInput) { qtyInput.value = 0; qtyInput.disabled = true; }
                } else {
                    reqInfoText.textContent =
                        `You already have ${inRequest}x in a pending request — you can add up to ${remaining} more.`;
                    if (maxInput) maxInput.value = remaining;
                    if (qtyInput) {
                        if (parseInt(qtyInput.value) > remaining) qtyInput.value = remaining;
                        qtyInput.disabled = false;
                    }
                }
                reqInfo.style.display = 'block';
            }
        })
        .catch(() => { /* silent — non-critical */ });
    }

    // Highlight the intended action button based on mode
    if (mode && addToCartBtn && buyNowBtn) {
        addToCartBtn.style.outline = '';
        buyNowBtn.style.outline = '';
        if (mode === 'cart') {
            addToCartBtn.focus();
            addToCartBtn.style.outline = '3px solid #2563eb';
            setTimeout(() => { addToCartBtn.style.outline = ''; }, 1500);
        } else if (mode === 'buynow') {
            buyNowBtn.focus();
            buyNowBtn.style.outline = '3px solid #16a34a';
            setTimeout(() => { buyNowBtn.style.outline = ''; }, 1500);
        }
    }
};

window.closeItemDetailModal = function() {
    const itemDetailModal = document.getElementById('itemDetailModal');
    if (itemDetailModal) {
        itemDetailModal.classList.remove('open');
        console.log('✅ Modal closed');
    }

    // Reset quantity warning
    const quantityWarning = document.getElementById('quantityWarning');
    if (quantityWarning) {
        quantityWarning.classList.remove('show');
    }

    // Reset request info banner
    const reqInfo = document.getElementById('modalRequestInfo');
    if (reqInfo) reqInfo.style.display = 'none';

    // Reset pending-request tracking so next modal open starts fresh
    modalInRequest = 0;
    const qtyInput = document.getElementById('itemQuantity');
    if (qtyInput) qtyInput.disabled = false;
};

// Handle click outside modal box
window.handleItemModalOutsideClick = function(event) {
    if (event.target === document.getElementById('itemDetailModal')) {
        closeItemDetailModal();
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

// Close modal on outside click (handled in HTML via handleItemModalOutsideClick)
// Kept for settings modal compatibility
window.onclick = function(event) {
    const settingsModal = document.getElementById("settingsModal");
    if (event.target === settingsModal && settingsModal) {
        settingsModal.style.display = "none";
    }
};

// =======================================================
// INITIALIZE ON PAGE LOAD
// =======================================================
// =======================================================
// ✅ REALTIME: Poll unread message count (client side)
// Updates chatNotificationBadge in navbar every 10s
// =======================================================
function updateClientMsgBadge(count) {
    const displayVal = count > 99 ? '99+' : (count > 0 ? String(count) : '');

    // Desktop: nav Message button badge
    const navBadge = document.getElementById('chatNotificationBadge');
    if (navBadge) {
        if (count > 0) {
            navBadge.textContent = displayVal;
            navBadge.style.display = 'flex';
        } else {
            navBadge.style.display = 'none';
        }
    }

    // Mobile: floating chat FAB badge
    const floatBadge = document.getElementById('floatingChatBadge');
    if (floatBadge) {
        if (count > 0) {
            floatBadge.textContent = displayVal;
            floatBadge.style.display = 'flex';
            floatBadge.classList.add('active');
        } else {
            floatBadge.style.display = 'none';
            floatBadge.classList.remove('active');
        }
    }
}

function pollClientUnreadMessages() {
    // Only run if user is authenticated
    if (typeof IS_USER_AUTHENTICATED === 'undefined' || !IS_USER_AUTHENTICATED) return;

    // Get establishment ID from the page
    const estIdEl = document.getElementById('establishment-id');
    const estId = estIdEl ? estIdEl.value : (typeof ESTABLISHMENT_ID !== 'undefined' ? ESTABLISHMENT_ID : null);
    if (!estId) return;

    // Skip if chat popup is open (user is reading)
    const chatPopup = document.getElementById('chatPopupContainer');
    if (chatPopup && chatPopup.classList.contains('active')) return;

    fetch(`/api/client-unread-messages/?establishment_id=${estId}`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            updateClientMsgBadge(data.unread_count);
            // Show toast if new message arrived
            const prev = parseInt(sessionStorage.getItem('prevClientMsgCount') || '0');
            if (data.unread_count > prev) {
                showClientMsgToast(data.unread_count - prev);
            }
            sessionStorage.setItem('prevClientMsgCount', data.unread_count);
        }
    })
    .catch(err => console.error('Error polling client messages:', err));
}

function showClientMsgToast(count) {
    // Remove existing toast if any
    const existing = document.getElementById('clientMsgToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'clientMsgToast';
    toast.style.cssText = `
        position:fixed;bottom:24px;right:24px;z-index:9999;
        background:#B71C1C;color:#fff;
        padding:14px 20px;border-radius:12px;
        box-shadow:0 4px 16px rgba(0,0,0,0.25);
        display:flex;align-items:center;gap:12px;
        font-family:'Segoe UI',sans-serif;font-size:14px;
        animation:slideInRight 0.3s ease;
    `;
    toast.innerHTML = `
        <i class="fas fa-envelope" style="font-size:18px;"></i>
        <div>
            <div style="font-weight:700;">New Message from Establishment</div>
            <div style="font-size:12px;opacity:0.9;">You have ${count} new message${count > 1 ? 's' : ''}. Click Message to view.</div>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;margin-left:8px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Establishment details JS loaded successfully');

    // ✅ Start polling for unread messages every 10s
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && IS_USER_AUTHENTICATED) {
        pollClientUnreadMessages();
        setInterval(pollClientUnreadMessages, 10000);
    }

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
// =======================================================
// PROFILE DROPDOWN FUNCTIONS
// =======================================================
// Toggle dropdown for user menu
if (typeof window.toggleDropdown === 'undefined') {
    window.toggleDropdown = function(event) {
        if (event) event.stopPropagation();
        const dropdown = document.getElementById("userDropdown");
        if (dropdown) {
            dropdown.classList.toggle("show");
        }
    };
}

// Close dropdown if clicked outside
document.addEventListener("click", function(event) {
    const dropdown = document.getElementById("userDropdown");
    const profileContainer = document.getElementById("profileContainer");
    if (dropdown && dropdown.classList.contains("show")) {
        if (!profileContainer || !profileContainer.contains(event.target)) {
            dropdown.classList.remove("show");
        }
    }
});

// Open settings modal
if (typeof window.openSettingsModal === 'undefined') {
    window.openSettingsModal = function(event) {
        if (event) event.preventDefault();
        // Close dropdown first
        const dropdown = document.getElementById("userDropdown");
        if (dropdown) dropdown.classList.remove("show");
        // Open modal
        const modal = document.getElementById("settingsModal");
        if (modal) {
            modal.style.display = "flex";
        }
    };
}

// Close settings modal
if (typeof window.closeSettingsModal === 'undefined') {
    window.closeSettingsModal = function() {
        const modal = document.getElementById("settingsModal");
        if (modal) {
            modal.style.display = "none";
        }
    };
}

// Image Preview Function for Profile Picture
if (typeof window.previewImage === 'undefined') {
    window.previewImage = function(event) {
        const input = event.target;
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const preview = document.getElementById('profileImagePreview');
                if (preview) {
                    preview.src = e.target.result;
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    };
}

// Close modals on clicking outside content
window.onclick = function(event) {
    const settingsModal = document.getElementById("settingsModal");
    if (event.target === settingsModal && settingsModal) {
        settingsModal.style.display = "none";
    }
};