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
        showMessage('An error occurred while updating quantity', 'error');
    });
}

// =======================================================
// CLEAR ENTIRE ESTABLISHMENT CART
// =======================================================
async function clearEstablishmentCart(establishmentId) {
    const confirmed = await showConfirmModal(
        'Clear Cart',
        'Are you sure you want to remove all items from this establishment?',
        'Yes, Clear All',
        'Cancel'
    );

    if (!confirmed) return;

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('establishment_id', establishmentId);

    fetch('/cart/clear-establishment/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage(data.message || 'Cart cleared successfully', 'success');

            // Remove the entire establishment box
            const cartBox = document.querySelector(`.establishment-cart-box[data-establishment-id="${establishmentId}"]`);
            if (cartBox) {
                cartBox.remove();
            }

            // Update cart badge
            if (typeof updateCartBadge === 'function') {
                updateCartBadge(data.cart_count);
            }

            // Reload if no items left
            if (data.cart_count === 0) {
                window.location.reload();
            } else {
                // Select next available establishment
                const nextCart = document.querySelector('.establishment-cart-box');
                if (nextCart) {
                    selectEstablishment(nextCart.dataset.establishmentId);
                }
            }
        } else {
            showMessage(data.message || 'Error clearing cart', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('An error occurred during cart clearance', 'error');
    });
}
window.clearEstablishmentCart = clearEstablishmentCart;

// =======================================================
// SELECT ESTABLISHMENT CART (Visual Feedback)
// =======================================================
function selectEstablishment(establishmentId) {
    // Remove active state from all boxes
    document.querySelectorAll('.establishment-cart-box').forEach(box => {
        box.classList.remove('active-cart');
    });

    // Add active state to selected box
    const selectedBox = document.querySelector(`.establishment-cart-box[data-establishment-id="${establishmentId}"]`);
    if (selectedBox) {
        selectedBox.classList.add('active-cart');

        // Store the active order ID
        const firstItem = selectedBox.querySelector('.cart-item');
        if (firstItem) {
            window.activeOrderId = firstItem.dataset.orderId;
        }

        // ✅ Always reset: show checkout button, hide payment options
        const checkoutBtn = document.getElementById('initial-checkout-btn');
        const paymentSection = document.getElementById('payment-method-section');
        if (checkoutBtn) checkoutBtn.style.setProperty('display', 'flex', 'important');
        if (paymentSection) paymentSection.style.setProperty('display', 'none', 'important');

        // Update summary
        updateOrderSummary(selectedBox);
    }
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
        // Only count checked items
        const checkbox = item.querySelector('.item-checkbox');
        if (checkbox && !checkbox.checked) return;

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
// ✅ NEW: SHOW PAYMENT METHOD SELECTION
// =======================================================
function showPaymentMethodSelection() {
    if (!window.activeOrderId) {
        showMessage('Please select an establishment to checkout', 'warning');
        return;
    }

    // Check that at least one item is selected
    const activeBox = document.querySelector('.establishment-cart-box.active-cart');
    if (activeBox) {
        const checkedItems = activeBox.querySelectorAll('.item-checkbox:checked');
        if (checkedItems.length === 0) {
            showMessage('Please select at least one item to checkout', 'warning');
            return;
        }
    }

    // Hide initial checkout button
    const initialBtn = document.getElementById('initial-checkout-btn');
    if (initialBtn) {
        initialBtn.style.setProperty('display', 'none', 'important');
    }

    // Show payment method selection
    const paymentSection = document.getElementById('payment-method-section');
    if (paymentSection) {
        paymentSection.style.setProperty('display', 'block', 'important');

        // Smooth scroll to payment options
        paymentSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
window.showPaymentMethodSelection = showPaymentMethodSelection;

// =======================================================
// ✅ NEW: PROCEED TO PAYMONGO (ONLINE PAYMENT)
// =======================================================
function proceedToPayMongoCheckout(button) {
    if (!window.activeOrderId) {
        showMessage('Please select an establishment to checkout', 'warning');
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <div class="payment-method-info"><span class="payment-method-name">Loading...</span></div>';

    // Redirect to custom KabsuEats checkout page
    window.location.href = '/checkout/?order_id=' + window.activeOrderId;
}
window.proceedToPayMongoCheckout = proceedToPayMongoCheckout;

// =======================================================
// ✅ NEW: PROCEED TO CASH PAYMENT
// =======================================================
function proceedToCashPayment(button) {
    if (!window.activeOrderId) {
        showMessage('Please select an establishment to checkout', 'warning');
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('order_id', window.activeOrderId);

    fetch('/payment/create-cash-order/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken },
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server error: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage('Order placed successfully!', 'success');
            // Redirect to success page
            setTimeout(() => {
                window.location.href = '/payment/success/?order_id=' + window.activeOrderId + '&payment_method=cash';
            }, 1000);
        } else {
            throw new Error(data.message || 'Failed to place order');
        }
    })
    .catch(error => {
        console.error('Cash Payment Error:', error);
        showMessage('Error: ' + error.message, 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-money-bill-wave"></i><div class="payment-method-info"><span class="payment-method-name">Cash Payment</span><span class="payment-method-desc">Pay when you claim</span></div>';
    });
}
window.proceedToCashPayment = proceedToCashPayment;

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

console.log('✅ Multi-Establishment Cart JS with Payment Method Selection loaded successfully');

// =======================================================
// ✅ CHECKBOX LOGIC
// =======================================================

// Called when a single item checkbox changes
function onItemCheckboxChange(checkbox) {
    const cartItem = checkbox.closest('.cart-item');
    if (cartItem) {
        cartItem.classList.toggle('item-unchecked', !checkbox.checked);
    }

    // Update the establishment's "Select All" checkbox state
    const orderId = checkbox.dataset.orderId;
    const cartBox = checkbox.closest('.establishment-cart-box');
    if (cartBox) {
        updateEstabSelectAll(cartBox);
    }

    // Update order summary if this establishment is active
    if (cartBox && cartBox.classList.contains('active-cart')) {
        updateOrderSummary(cartBox);
    }
}
window.onItemCheckboxChange = onItemCheckboxChange;

// Called when establishment "Select All" checkbox changes
function toggleEstablishmentItems(selectAllCheckbox) {
    const cartBox = selectAllCheckbox.closest('.establishment-cart-box');
    if (!cartBox) return;

    const itemCheckboxes = cartBox.querySelectorAll('.item-checkbox');
    itemCheckboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
        const cartItem = cb.closest('.cart-item');
        if (cartItem) {
            cartItem.classList.toggle('item-unchecked', !selectAllCheckbox.checked);
        }
    });

    // Update summary if active
    if (cartBox.classList.contains('active-cart')) {
        updateOrderSummary(cartBox);
    }
}
window.toggleEstablishmentItems = toggleEstablishmentItems;

// Sync the "Select All" checkbox based on individual item states
function updateEstabSelectAll(cartBox) {
    const selectAll = cartBox.querySelector('.estab-select-all');
    if (!selectAll) return;
    const allBoxes = cartBox.querySelectorAll('.item-checkbox');
    const checkedBoxes = cartBox.querySelectorAll('.item-checkbox:checked');
    selectAll.checked = allBoxes.length === checkedBoxes.length;
    selectAll.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
}

// Get only checked item IDs for the active cart (used by payment functions)
function getCheckedItemIds() {
    const activeBox = document.querySelector('.establishment-cart-box.active-cart');
    if (!activeBox) return [];
    const checked = activeBox.querySelectorAll('.item-checkbox:checked');
    return Array.from(checked).map(cb => cb.dataset.itemId);
}