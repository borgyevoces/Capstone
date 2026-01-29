// =======================================================
// MULTI-ESTABLISHMENT CART SYSTEM - REAL-TIME UPDATES
// =======================================================

// =======================================================
// ADD TO CART FUNCTION
// =======================================================
function addToCart(menuItemId, button) {
    const quantityInput = document.querySelector(`input[name="quantity_${menuItemId}"]`);
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    if (quantity < 1) {
        showMessage('Please select at least 1 item', 'warning');
        return;
    }

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', menuItemId);
    formData.append('quantity', quantity);

    fetch('/cart/add/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server error: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage(data.message || 'Item added to cart!', 'success');

            // Update cart badge with total count across all establishments
            if (typeof updateCartBadge === 'function') {
                updateCartBadge(data.cart_count);
            }

            // Reset quantity input
            if (quantityInput) {
                quantityInput.value = 1;
            }
        } else {
            showMessage(data.message || 'Failed to add item to cart.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('An error occurred while adding to cart.', 'error');
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = originalHTML;
    });
}
window.addToCart = addToCart;

// =======================================================
// REMOVE ITEM FROM CART
// =======================================================
async function removeItemFromCart(orderItemId) {
    const confirmed = await showConfirmModal(
        'Remove Item',
        'Are you sure you want to remove this item from your cart?',
        'Yes, Remove',
        'Cancel'
    );

    if (!confirmed) return;

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('order_item_id', orderItemId);

    fetch('/cart/remove/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage(data.message || 'Item removed from cart', 'success');

            // Remove item row with animation
            const itemRow = document.querySelector(`#cart-item-${orderItemId}`);
            if (itemRow) {
                itemRow.style.opacity = '0';
                itemRow.style.transform = 'translateX(-20px)';

                setTimeout(() => {
                    const cartBox = itemRow.closest('.establishment-cart-box');
                    const establishmentId = cartBox.dataset.establishmentId;

                    itemRow.remove();

                    // Check if establishment cart is now empty
                    const remainingItems = cartBox.querySelectorAll('.cart-item');

                    if (remainingItems.length === 0 || data.order_deleted) {
                        // Remove entire establishment box
                        cartBox.remove();

                        // Select next available establishment
                        const nextCart = document.querySelector('.establishment-cart-box');
                        if (nextCart) {
                            selectEstablishment(nextCart.dataset.establishmentId);
                        }
                    } else {
                        // Update summary for this establishment
                        updateOrderSummary(cartBox);
                    }

                    // Update cart badge
                    if (typeof updateCartBadge === 'function') {
                        updateCartBadge(data.cart_count);
                    }

                    // Reload if no items left at all
                    if (data.cart_count === 0) {
                        window.location.reload();
                    }
                }, 300);
            }
        } else {
            showMessage(data.message || 'Error removing item', 'error');
            window.location.reload();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('An error occurred during removal', 'error');
    });
}
window.removeItemFromCart = removeItemFromCart;

// =======================================================
// REAL-TIME QUANTITY UPDATE FUNCTION
// =======================================================
function updateQuantityRealTime(itemId, newQuantity) {
    const cartItem = document.querySelector(`#cart-item-${itemId}`);
    const quantityEl = cartItem.querySelector(`.quantity-value[data-item-id="${itemId}"]`);
    const subtotalEl = cartItem.querySelector(`#item-total-${itemId}`);
    const unitPriceEl = cartItem.querySelector('.item-price');
    const unitPrice = parseFloat(unitPriceEl.dataset.unitPrice);
    const maxStock = parseInt(cartItem.dataset.maxStock);

    // ✅ INSTANT UI UPDATE (Optimistic)
    quantityEl.textContent = newQuantity;
    const newSubtotal = (unitPrice * newQuantity).toFixed(2);
    subtotalEl.textContent = `₱${newSubtotal}`;

    // Update button states
    const decreaseBtn = cartItem.querySelector('.btn-decrease');
    const increaseBtn = cartItem.querySelector('.btn-increase');

    decreaseBtn.disabled = newQuantity <= 1;
    increaseBtn.disabled = newQuantity >= maxStock;

    // Update establishment summary
    const cartBox = cartItem.closest('.establishment-cart-box');
    updateOrderSummary(cartBox);

    // ✅ SEND TO SERVER (Background)
    updateCartItemQuantity(itemId, newQuantity);
}
window.updateQuantityRealTime = updateQuantityRealTime;

// =======================================================
// UPDATE CART ITEM QUANTITY (Background Server Call)
// =======================================================
function updateCartItemQuantity(orderItemId, newQuantity) {
    if (newQuantity < 1) {
        return; // Already handled in UI
    }

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('order_item_id', orderItemId);
    formData.append('quantity', newQuantity);

    fetch('/cart/update/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update cart badge
            if (typeof updateCartBadge === 'function' && data.cart_count !== undefined) {
                updateCartBadge(data.cart_count);
            }
        } else {
            // Rollback on error
            showMessage('Error: ' + data.message, 'error');
            window.location.reload();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Don't show error to user unless critical
    });
}
window.updateCartItemQuantity = updateCartItemQuantity;

// =======================================================
// CLEAR ENTIRE ESTABLISHMENT CART
// =======================================================
async function clearEstablishmentCart(establishmentId) {
    const confirmed = await showConfirmModal(
        'Clear Cart',
        'Are you sure you want to remove all items from this establishment?',
        'Yes, Clear',
        'Cancel'
    );

    if (!confirmed) return;

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('establishment_id', establishmentId);

    fetch('/cart/clear-establishment/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('Cart cleared', 'success');

            // Remove establishment box
            const box = document.querySelector(`[data-establishment-id="${establishmentId}"]`);
            if (box) {
                box.style.opacity = '0';
                box.style.transform = 'scale(0.95)';

                setTimeout(() => {
                    box.remove();

                    // Update cart badge
                    if (typeof updateCartBadge === 'function') {
                        updateCartBadge(data.cart_count);
                    }

                    // Reload if no carts left
                    if (data.cart_count === 0) {
                        window.location.reload();
                    } else {
                        // Select next available establishment
                        const nextCart = document.querySelector('.establishment-cart-box');
                        if (nextCart) {
                            selectEstablishment(nextCart.dataset.establishmentId);
                        }
                    }
                }, 300);
            }
        } else {
            showMessage(data.message || 'Error clearing cart', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('An error occurred while clearing the cart.', 'error');
    });
}
window.clearEstablishmentCart = clearEstablishmentCart;

// =======================================================
// SELECT ESTABLISHMENT (for checkout)
// =======================================================
function selectEstablishment(establishmentId) {
    // Remove previous selection
    document.querySelectorAll('.establishment-cart-box').forEach(box => {
        box.classList.remove('active-cart');
    });

    // Mark as active
    const selectedBox = document.querySelector(`[data-establishment-id="${establishmentId}"]`);
    if (!selectedBox) return;

    selectedBox.classList.add('active-cart');
    window.activeEstablishmentId = establishmentId;

    // Get order ID from first item
    const firstItem = selectedBox.querySelector('.cart-item');
    window.activeOrderId = firstItem ? firstItem.dataset.orderId : null;

    // Update summary
    updateOrderSummary(selectedBox);
}
window.selectEstablishment = selectEstablishment;

// =======================================================
// UPDATE ORDER SUMMARY
// =======================================================
function updateOrderSummary(cartBox) {
    const establishmentName = cartBox.querySelector('.cart-establishment-info h2').textContent;
    const items = cartBox.querySelectorAll('.cart-item');

    let subtotal = 0;
    let itemCount = 0;

    items.forEach(item => {
        const priceText = item.querySelector('.item-subtotal').textContent;
        const price = parseFloat(priceText.replace('₱', '').replace(',', ''));
        const quantity = parseInt(item.querySelector('.quantity-value').textContent);

        subtotal += price;
        itemCount += quantity;
    });

    // Update summary display
    const summaryContainer = document.querySelector('#active-order-summary');
    const nameEl = summaryContainer.querySelector('.summary-establishment-name');
    const countEl = summaryContainer.querySelector('.summary-item-count');
    const subtotalEl = summaryContainer.querySelector('.summary-subtotal');
    const totalEl = summaryContainer.querySelector('.grand-total-amount');

    if (nameEl) nameEl.textContent = establishmentName;
    if (countEl) countEl.textContent = `(${itemCount} items)`;
    if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₱${subtotal.toFixed(2)}`;

    // Show summary content
    const instruction = summaryContainer.querySelector('.summary-instruction');
    const content = summaryContainer.querySelector('.summary-content');

    if (instruction) instruction.style.display = 'none';
    if (content) content.style.display = 'block';
}
window.updateOrderSummary = updateOrderSummary;

// =======================================================
// PROCEED TO CHECKOUT (PAYMONGO GCASH)
// =======================================================
function proceedToCheckout(button) {
    if (!window.activeOrderId) {
        showMessage('Please select an establishment to checkout', 'warning');
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Payment Link...';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('order_id', window.activeOrderId);

    fetch('/payment/create-gcash-link/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken },
        credentials: 'same-origin'
    })
    .then(async response => {
        // Try to parse JSON body even on non-OK so we can surface upstream details
        let bodyText = '';
        try {
            const cloned = response.clone();
            bodyText = await cloned.text();
        } catch (e) {
            bodyText = '';
        }

        if (!response.ok) {
            // Attempt to extract message from JSON body
            try {
                const errData = JSON.parse(bodyText || '{}');
                const upstreamStatus = errData.upstream_status || response.status;
                const upstreamBody = errData.upstream_body || bodyText;
                console.error('Checkout upstream error', upstreamStatus, upstreamBody);
                throw new Error(errData.message || `Server error: ${response.status} ${response.statusText}`);
            } catch (parseErr) {
                console.error('Checkout error response (non-JSON):', response.status, bodyText);
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.checkout_url) {
            showMessage('Redirecting to PayMongo for payment...', 'info');
            setTimeout(() => {
                window.location.href = data.checkout_url;
            }, 1000);
        } else {
            throw new Error(data.message || 'Failed to create payment link');
        }
    })
    .catch(error => {
        console.error('Checkout Error:', error);
        showMessage('Error: ' + error.message, 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-lock"></i> Proceed to Checkout';
    });
}
window.proceedToCheckout = proceedToCheckout;

// =======================================================
// HELPER FUNCTION: Get CSRF Token
// =======================================================
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// =======================================================
// HELPER FUNCTION: Show Confirm Modal
// =======================================================
async function showConfirmModal(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        if (typeof window.customConfirm === 'function') {
            window.customConfirm(title, message, confirmText, cancelText, resolve);
        } else {
            resolve(confirm(message));
        }
    });
}

// =======================================================
// HELPER FUNCTION: Show Message
// =======================================================
function showMessage(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// =======================================================
// PAGE LOAD INITIALIZATION - REAL-TIME QUANTITY CONTROLS
// =======================================================
document.addEventListener('DOMContentLoaded', function() {
    // Auto-select first establishment on page load
    const firstCart = document.querySelector('.establishment-cart-box');
    if (firstCart) {
        const establishmentId = firstCart.dataset.establishmentId;
        selectEstablishment(establishmentId);
    }

    // Make establishment boxes clickable
    document.querySelectorAll('.establishment-cart-box').forEach(box => {
        box.addEventListener('click', function(e) {
            // Don't trigger if clicking buttons or controls
            if (e.target.closest('.quantity-btn, .remove-item-btn, .clear-establishment-btn')) {
                return;
            }

            const establishmentId = this.dataset.establishmentId;
            selectEstablishment(establishmentId);
        });
    });

    // ✅ REAL-TIME QUANTITY CONTROLS - Event Delegation
    document.addEventListener('click', function(e) {
        // Handle DECREASE button
        if (e.target.closest('.btn-decrease')) {
            const button = e.target.closest('.btn-decrease');
            const itemId = button.dataset.itemId;
            const cartItem = document.querySelector(`#cart-item-${itemId}`);
            const quantityEl = cartItem.querySelector(`.quantity-value[data-item-id="${itemId}"]`);
            const currentQty = parseInt(quantityEl.textContent);

            if (currentQty > 1) {
                updateQuantityRealTime(itemId, currentQty - 1);
            }
        }

        // Handle INCREASE button
        if (e.target.closest('.btn-increase')) {
            const button = e.target.closest('.btn-increase');
            const itemId = button.dataset.itemId;
            const cartItem = document.querySelector(`#cart-item-${itemId}`);
            const maxStock = parseInt(cartItem.dataset.maxStock);
            const quantityEl = cartItem.querySelector(`.quantity-value[data-item-id="${itemId}"]`);
            const currentQty = parseInt(quantityEl.textContent);

            if (currentQty < maxStock) {
                updateQuantityRealTime(itemId, currentQty + 1);
            }
        }
    });
});

console.log('✅ Multi-Establishment Cart JS loaded successfully');