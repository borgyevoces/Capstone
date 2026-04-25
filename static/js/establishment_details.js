// =======================================================
// ESTABLISHMENT DETAILS JS - COMPLETE WITH BUY NOW PAYMONGO
// =======================================================

// Tracks how many of the open modal item are already in a pending order request
let modalInRequest  = 0;
let modalInCart     = 0;   // qty already in PENDING cart for the open modal item
let estCartQtyCache = {};  // { itemId: qty } — PENDING cart qty, preloaded on page load
let estReqQtyCache  = {};  // { itemId: qty } — request/to_pay committed qty, preloaded

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
// CART BADGE UPDATE — mirrors kabsueats.js exactly
// Accepts a number (apply immediately) OR no arg (fetch from server)
// =======================================================
window.updateCartBadge = function(countOrTrigger) {
    if (typeof countOrTrigger === 'number') {
        _applyEstCartBadgeCount(countOrTrigger, true);
    } else {
        _refreshEstCartBadge();
    }
};

function _applyEstCartBadgeCount(count, animate) {
    count = parseInt(count) || 0;
    document.querySelectorAll('#cart-count-badge, .cart-count-badge').forEach(function(badge) {
        const prev = parseInt(badge.textContent, 10) || 0;
        badge.textContent   = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        if (animate && count !== prev && count > 0) {
            badge.style.transition = 'transform .2s cubic-bezier(.34,1.56,.64,1)';
            badge.style.transform  = 'scale(1.6)';
            setTimeout(function() { badge.style.transform = 'scale(1)'; }, 200);
        }
    });
    // Broadcast to kabsueats.js cross-tab system if available
    if (typeof window.setCartBadgeCount === 'function') {
        window.setCartBadgeCount(count, animate !== false);
    }
}

function _refreshEstCartBadge() {
    var url = (typeof URLS !== 'undefined' && URLS.cartCount) ? URLS.cartCount : null;
    if (!url) return;
    fetch(url, { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var count = parseInt(
                data.cart_count != null ? data.cart_count : (data.count != null ? data.count : 0),
                10
            );
            _applyEstCartBadgeCount(count, false);
        })
        .catch(function() {});
}

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
// ✅ MODAL ADD TO CART — exact mirror of kabsueats addToCartFromModal
// • Button is NEVER disabled (fire-and-forget)
// • Fly animation fires on every successful add
// • Modal stays open the whole time
// • canAdd tracked locally, same pattern as kabsueats currentModalInCart
// =======================================================
window.handleModalAddToCart = function(button) {
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && !IS_USER_AUTHENTICATED) {
        showMessage('Please log in to add items to cart', 'warning');
        setTimeout(function() { window.location.href = LOGIN_REGISTER_URL || '/accounts/login/'; }, 1500);
        return;
    }

    const mqtyEl        = document.getElementById('itemQuantity');
    const maxQtyInput   = document.getElementById('modalMaxQuantity');
    const modalEl       = document.getElementById('itemDetailModal');
    const modalItemIdEl = document.getElementById('modalItemId');

    if (!modalItemIdEl || !mqtyEl) return;

    // qty input disabled means cart is already full — go straight to cart
    if (parseInt(mqtyEl.value) <= 0 || mqtyEl.disabled) {
        window.location.href = '/cart/';
        return;
    }

    const itemId   = modalItemIdEl.value;
    const qty      = parseInt(mqtyEl.value) || 1;
    const maxStock = modalEl ? parseInt(modalEl.dataset.maxStock || 0) : 0;

    // ── Fire — NEVER disable the button (same as kabsueats) ──────────
    const csrfToken = getCookie('csrftoken');
    const formData  = new FormData();
    formData.append('menu_item_id', itemId);
    formData.append('quantity', qty);

    fetch('/cart/add/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin'
    })
    .then(function(r) {
        if (!r.ok) {
            if (r.status === 403) throw new Error('Please log in to add items to cart');
            throw new Error('Server error');
        }
        return r.json();
    })
    .then(function(data) {
        if (data.success) {
            // 1. Badge — prefer setCartBadgeCount (cross-tab broadcast, same as kabsueats)
            if (typeof data.cart_count === 'number') {
                if (typeof window.setCartBadgeCount === 'function') {
                    window.setCartBadgeCount(data.cart_count, true);
                } else {
                    window.updateCartBadge(data.cart_count);
                }
            } else {
                window.updateCartBadge(true);
            }

            // 2. Fly animation — modal stays OPEN, starts from Add to Cart button
            _flyToCartFromModal(null, button);

            // 3. Local running total — same as kabsueats currentModalInCart
            estCartQtyCache[String(itemId)] = (parseInt(estCartQtyCache[String(itemId)] || 0)) + qty;
            const inCart = parseInt(estCartQtyCache[String(itemId)]);
            const canAdd = Math.max(0, maxStock - inCart);

            const reqInfo = document.getElementById('modalRequestInfo');
            const reqText = document.getElementById('modalRequestInfoText');

            if (canAdd <= 0) {
                // Cart full — switch button to "Go to Cart" only, no banner
                if (mqtyEl) { mqtyEl.value = 1; mqtyEl.disabled = true; }
                if (maxQtyInput) maxQtyInput.value = 0;
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-shopping-cart"></i> Go to Cart';
                button.style.background = '#dc2626';
                button.onclick = function(e) { e.preventDefault(); window.location.href = '/cart/'; };
            } else {
                // Still has room — cap qty silently, keep button active
                if (maxQtyInput) maxQtyInput.value = canAdd;
                if (mqtyEl) {
                    mqtyEl.max = canAdd;
                    if (parseInt(mqtyEl.value) > canAdd) mqtyEl.value = 1;
                }
            }

        } else {
            showMessage(data.message || 'Could not add to cart.', 'error');
        }
    })
    .catch(function(error) {
        showMessage('Network error. Please try again.', 'error');
        if (error.message && error.message.includes('log in')) {
            setTimeout(function() { window.location.href = LOGIN_REGISTER_URL || '/accounts/login/'; }, 2000);
        }
    });
};

// ── Flying-to-cart animation ──
// imgEl : optional source image element (falls back to #modalItemImage)
// srcBtn: optional source button — when provided, animation starts FROM the button
function _flyToCartFromModal(imgEl, srcBtn) {
    // ── Find cart target: desktop sidebar first, then mobile bottom nav ──
    const flyTarget =
        document.querySelector('.client-sidebar .cart-link .csb-ico i.fa-shopping-cart') ||
        document.querySelector('.client-sidebar .cart-link .csb-ico') ||
        document.querySelector('.client-sidebar .cart-link') ||
        document.querySelector('#mobBottomNav .mob-nav-item .fa-shopping-cart') ||
        document.querySelector('#cart-count-badge') ||
        document.querySelector('.cart-badge');

    const bounceTarget =
        document.querySelector('.client-sidebar .cart-link .csb-ico') ||
        document.querySelector('#mobBottomNav .mob-nav-item .fa-shopping-cart') ||
        flyTarget;

    // ── Determine start position ──────────────────────────────────────
    let startX, startY, flySize, arcHeight;

    if (srcBtn) {
        // START: centre of the "Add to Cart" button
        const r = srcBtn.getBoundingClientRect();
        flySize   = 44;
        startX    = r.left + r.width  / 2 - flySize / 2;
        startY    = r.top  + r.height / 2 - flySize / 2;
        arcHeight = -120; // strong upward arc from button → cart
    } else {
        // Fallback: start from modal food image
        const modalImg = imgEl || document.getElementById('modalItemImage');
        flySize = 52;
        if (modalImg) {
            const r = modalImg.getBoundingClientRect();
            startX = r.left + r.width  / 2 - flySize / 2;
            startY = r.top  + r.height / 2 - flySize / 2;
        } else {
            startX = window.innerWidth  / 2 - flySize / 2;
            startY = window.innerHeight / 2 - flySize / 2;
        }
        arcHeight = -80;
    }

    // ── Determine end position ────────────────────────────────────────
    let endX, endY;
    if (flyTarget) {
        const cartRect = flyTarget.getBoundingClientRect();
        if (cartRect.width > 0 && cartRect.height > 0 &&
            cartRect.top >= -10 && cartRect.left >= -10 &&
            cartRect.bottom <= window.innerHeight + 10 &&
            cartRect.right  <= window.innerWidth  + 10) {
            endX = cartRect.left + cartRect.width  / 2 - flySize / 2;
            endY = cartRect.top  + cartRect.height / 2 - flySize / 2;
        } else {
            endX = window.innerWidth  - 60;
            endY = 20;
        }
    } else {
        endX = window.innerWidth  - 60;
        endY = 20;
    }

    // ── Build the flying bubble ───────────────────────────────────────
    const fly = document.createElement('div');
    fly.style.cssText = [
        'position:fixed',
        'width:'  + flySize + 'px',
        'height:' + flySize + 'px',
        'border-radius:50%',
        'overflow:hidden',
        'background:linear-gradient(135deg,#B71C1C,#ef4444)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'z-index:9999999',
        'pointer-events:none',
        'box-shadow:0 6px 20px rgba(183,28,28,.55)',
        'border:2.5px solid rgba(255,255,255,0.35)',
        'transition:none',
        'will-change:transform,left,top',
    ].join(';');

    // Always show cart icon — makes intent crystal-clear
    const modalImg = imgEl || document.getElementById('modalItemImage');
    const iconSize = Math.round(flySize * 0.40);
    if (modalImg && modalImg.src) {
        fly.innerHTML =
            '<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">' +
            '<i class="fas fa-shopping-cart" style="color:#fff;font-size:' + iconSize + 'px;"></i>' +
            '<img src="' + modalImg.src + '" style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;object-fit:cover;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);">' +
            '</div>';
    } else {
        fly.innerHTML = '<i class="fas fa-shopping-cart" style="color:#fff;font-size:' + iconSize + 'px;"></i>';
    }

    document.body.appendChild(fly);
    fly.style.left = startX + 'px';
    fly.style.top  = startY + 'px';

    // ── Tiny launch burst on the source button ────────────────────────
    if (srcBtn) {
        srcBtn.style.transition = 'transform .12s ease';
        srcBtn.style.transform  = 'scale(0.92)';
        setTimeout(function () {
            srcBtn.style.transform = 'scale(1)';
            setTimeout(function () { srcBtn.style.transition = ''; }, 140);
        }, 120);
    }

    // ── Animate: arc + spin + shrink ─────────────────────────────────
    const duration  = 620;
    const startTime = performance.now();

    function step(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const arc  = Math.sin(Math.PI * progress) * arcHeight;
        const curX = startX + (endX - startX) * t;
        const curY = startY + (endY - startY) * t + arc;
        const scale = 1 - 0.55 * t;
        const rot   = t * 360;

        fly.style.left      = curX + 'px';
        fly.style.top       = curY + 'px';
        fly.style.transform = 'scale(' + scale + ') rotate(' + rot + 'deg)';
        fly.style.opacity   = progress > 0.85 ? String(1 - (progress - 0.85) / 0.15) : '1';

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            fly.remove();
            if (bounceTarget) _popEstCartIcon(bounceTarget);
        }
    }
    requestAnimationFrame(step);
}

// Pop-bounce the cart icon on landing — same as kabsueats _popCartIcon
function _popEstCartIcon(el) {
    if (!el) return;
    el.style.transition = 'transform .18s cubic-bezier(.34,1.56,.64,1)';
    el.style.transform  = 'scale(1.45)';
    setTimeout(function() {
        el.style.transform = 'scale(1)';
        setTimeout(function() { el.style.transition = ''; }, 200);
    }, 180);
}

// =======================================================
// ✅ QUICK ADD TO CART (FROM MENU LIST)
// =======================================================
window.handleQuickAddToCart = function(button, event) {
    if (event) {
        event.stopPropagation();
    }


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
            // Fly animation from the quick-add button itself
            _flyToCartFromModal(null, button);

            showMessage(
                data.message || 'Item added to cart!',
                'success',
                {
                    text: '🛒 View Cart',
                    onClick: () => { window.location.href = '/cart/'; }
                }
            );
            if (typeof data.cart_count === 'number') {
                if (typeof window.setCartBadgeCount === 'function') {
                    window.setCartBadgeCount(data.cart_count, true);
                } else {
                    window.updateCartBadge(data.cart_count);
                }
            } else {
                window.updateCartBadge();
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

    const itemId = menuItemElement.dataset.itemId;
    const itemName = menuItemElement.dataset.itemName;
    const itemPrice = menuItemElement.dataset.price;
    const itemDescription = menuItemElement.dataset.itemDescription;
    const itemImageUrl = menuItemElement.dataset.itemImageUrl;
    const itemQuantity = parseInt(menuItemElement.dataset.itemQuantity) || 0;
    const isTopSeller = menuItemElement.dataset.isTopSeller === 'true';


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
    if (itemQuantityInput) { itemQuantityInput.value = 1; itemQuantityInput.disabled = false; itemQuantityInput.removeAttribute('max'); }
    if (modalMaxQuantity) modalMaxQuantity.value = itemQuantity;

    // Store original maxStock for use by handleModalAddToCart
    const itemDetailModal = document.getElementById('itemDetailModal');
    if (itemDetailModal) itemDetailModal.dataset.maxStock = itemQuantity;

    // Reset Add to Cart button to original state
    const addToCartBtn = document.getElementById('modalAddToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.innerHTML        = '<i class="fas fa-cart-plus"></i> Add to Cart';
        addToCartBtn.style.background = '';
        addToCartBtn.style.opacity    = itemQuantity > 0 ? '1' : '0.5';
        addToCartBtn.disabled         = itemQuantity <= 0;
        // ⚠️ Do NOT set .onclick = null — that wipes the HTML onclick="handleModalAddToCart(this)" attribute.
        // Instead remove any JS-assigned overrides by cloning the button.
        const freshBtn = addToCartBtn.cloneNode(true);
        addToCartBtn.parentNode.replaceChild(freshBtn, addToCartBtn);
    }

    // Reset banner
    const reqInfoReset = document.getElementById('modalRequestInfo');
    if (reqInfoReset) reqInfoReset.style.display = 'none';

    // Reset local cache for this item so running total starts fresh per open
    if (typeof estCartQtyCache !== 'undefined') delete estCartQtyCache[String(itemId)];

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

    // ✅ FIX: Use EST_STATUS from server (set in HTML template) for accurate status
    const estStatus = document.getElementById('itemModalEstStatus');
    const buyNowBtn    = document.getElementById('modalBuyNowBtn');
    const addToCartBtnEl = document.getElementById('modalAddToCartBtn');

    // Helper to apply status + button state
    function _applyEstStatus(statusStr) {
        const isOpen = statusStr === 'Open';
        if (estStatus) {
            estStatus.className = 'item-modal-est-status ' + (isOpen ? 'open' : 'closed');
            estStatus.textContent = isOpen ? 'Open' : 'Closed';
        }
        const canOrder = isOpen && itemQuantity > 0;
        if (buyNowBtn)      { buyNowBtn.disabled = !canOrder;    buyNowBtn.style.opacity = canOrder ? '1' : '0.5'; }
        if (addToCartBtnEl) { addToCartBtnEl.disabled = !canOrder; addToCartBtnEl.style.opacity = canOrder ? '1' : '0.5'; }
    }

    // Apply immediately from template value (if set), default to Open so buttons are usable
    const initialStatus = (typeof EST_STATUS !== 'undefined') ? EST_STATUS : 'Open';
    _applyEstStatus(initialStatus);

    // ✅ Fetch fresh status from realtime API — update once response arrives
    if (typeof ESTABLISHMENT_REALTIME_URL !== 'undefined') {
        fetch(ESTABLISHMENT_REALTIME_URL, { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (!data.success) return;
                const freshStatus = data.status || 'Open';
                EST_STATUS = freshStatus;
                _applyEstStatus(freshStatus);
            })
            .catch(() => {});
    }

    const itemDetailModalEl = document.getElementById('itemDetailModal');
    if (itemDetailModalEl) {
        itemDetailModalEl.classList.add('open');
    }

    // ── Reset request info banner ──────────────────────────────────
    const reqInfo     = document.getElementById('modalRequestInfo');
    const reqInfoText = document.getElementById('modalRequestInfoText');
    if (reqInfo) reqInfo.style.display = 'none';

    // ── Read from preloaded estCartQtyCache — INSTANT ──────────────
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && IS_USER_AUTHENTICATED) {
        _applyEstCartQtyToModal(itemId, itemQuantity, reqInfo, reqInfoText);
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
    }

    // Reset quantity warning
    const quantityWarning = document.getElementById('quantityWarning');
    if (quantityWarning) {
        quantityWarning.classList.remove('show');
    }

    // Reset request info banner
    const reqInfo = document.getElementById('modalRequestInfo');
    if (reqInfo) reqInfo.style.display = 'none';

    // Reset tracking so next modal open starts fresh
    modalInRequest = 0;
    modalInCart    = 0;
    // Note: estCartQtyCache and estReqQtyCache are page-level, kept for next open
    const qtyInput = document.getElementById('itemQuantity');
    if (qtyInput) { qtyInput.disabled = false; qtyInput.value = 1; qtyInput.removeAttribute('max'); }

    // Reset info banner styles
    const reqInfoReset = document.getElementById('modalRequestInfo');
    if (reqInfoReset) {
        reqInfoReset.style.display     = 'none';
        reqInfoReset.style.background  = '';
        reqInfoReset.style.borderColor = '';
        reqInfoReset.style.color       = '';
    }

    // Reset Add to Cart button back to original
    const addToCartBtnClose = document.getElementById('modalAddToCartBtn');
    if (addToCartBtnClose) {
        // Clone to strip any JS-assigned onclick overrides without wiping the HTML attribute
        const freshBtn = addToCartBtnClose.cloneNode(true);
        freshBtn.innerHTML        = '<i class="fas fa-cart-plus"></i> Add to Cart';
        freshBtn.style.background = '';
        freshBtn.style.opacity    = '';
        freshBtn.disabled         = false;
        addToCartBtnClose.parentNode.replaceChild(freshBtn, addToCartBtnClose);
    }
    const maxInput = document.getElementById('modalMaxQuantity');
    if (maxInput) maxInput.value = '';
};

// Handle click outside modal box
window.handleItemModalOutsideClick = function(event) {
    if (event.target === document.getElementById('itemDetailModal')) {
        closeItemDetailModal();
    }
};

// Silently applies cart qty limits — no banners shown, just caps qty input and switches button if max reached
function _applyEstCartQtyToModal(itemId, maxStock, reqInfo, reqInfoText) {
    const key        = String(itemId);
    const inCart     = parseInt(estCartQtyCache[key] || 0);
    modalInCart      = inCart;

    const addToCartBtn = document.getElementById('modalAddToCartBtn');
    const maxInput     = document.getElementById('modalMaxQuantity');
    const qtyInput     = document.getElementById('itemQuantity');
    const canAdd       = Math.max(0, maxStock - inCart);

    // Always hide banner
    if (reqInfo) reqInfo.style.display = 'none';

    if (canAdd <= 0) {
        // Already at max — switch button to "Go to Cart", disable qty input
        if (qtyInput) { qtyInput.value = 1; qtyInput.disabled = true; }
        if (maxInput) maxInput.value = 0;
        if (addToCartBtn) {
            addToCartBtn.innerHTML        = '<i class="fas fa-shopping-cart"></i> Go to Cart';
            addToCartBtn.style.background = '#dc2626';
            addToCartBtn.disabled         = false;
            addToCartBtn.onclick          = function() { window.location.href = '/cart/'; };
        }
    } else {
        // Still has room — silently cap the qty input max
        if (maxInput) maxInput.value = canAdd;
        if (qtyInput) {
            qtyInput.max      = canAdd;
            qtyInput.disabled = false;
            if (parseInt(qtyInput.value) > canAdd) qtyInput.value = 1;
        }
    }
}

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
};

// Close settings modal on outside click — use addEventListener to avoid overriding other handlers
document.addEventListener('click', function(event) {
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal && event.target === settingsModal) {
        settingsModal.style.display = "none";
    }
});

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

// Preload PENDING cart qtys + request/to_pay qtys for this establishment
function refreshEstCartQtyCache() {
    if (typeof IS_USER_AUTHENTICATED === 'undefined' || !IS_USER_AUTHENTICATED) return;
    const estIdEl = document.getElementById('modalEstablishmentId');
    const estId   = estIdEl ? estIdEl.value : (typeof ESTABLISHMENT_ID !== 'undefined' ? ESTABLISHMENT_ID : null);
    if (!estId) return;

    // These paths must be registered in urls.py — see urls_to_add.py snippet
    const pendingUrl = '/api/pending-cart-qtys/?establishment_id=' + estId;
    const requestUrl = '/api/request-qtys/?establishment_id=' + estId;

    fetch(pendingUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : { qtys: {} })
        .catch(() => ({ qtys: {} }))
        .then(function(data) { if (data.qtys) estCartQtyCache = data.qtys; });

    fetch(requestUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : { qtys: {} })
        .catch(() => ({ qtys: {} }))
        .then(function(data) { if (data.qtys) estReqQtyCache = data.qtys; });
}

document.addEventListener('DOMContentLoaded', function() {
    // ✅ Start polling for unread messages every 10s
    if (typeof IS_USER_AUTHENTICATED !== 'undefined' && IS_USER_AUTHENTICATED) {
        pollClientUnreadMessages();
        setInterval(pollClientUnreadMessages, 10000);
    }

    // ✅ Preload cart qty cache on page load
    refreshEstCartQtyCache();
    setInterval(refreshEstCartQtyCache, 30000);

    // ✅ Sync cart badge count on page load — fetch from server after a short delay
    // so URLS (from the base template) is ready. Mirrors kabsueats.js behavior.
    setTimeout(function() { _refreshEstCartBadge(); }, 400);
    // Keep badge fresh every 15s while user stays on the page
    setInterval(function() { _refreshEstCartBadge(); }, 15000);
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

// (settings modal outside-click is handled by the addEventListener above)