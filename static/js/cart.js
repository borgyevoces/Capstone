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
// SEND ORDER REQUEST — checkbox-aware, multi-establishment
// Only sends checked items. Unchecked items stay in cart.
// =======================================================
function sendOrderRequest() {
    const btn = document.getElementById('initial-checkout-btn');

    // Collect every establishment box that has at least one checked item
    const estabBoxes   = document.querySelectorAll('.establishment-cart-box');
    const ordersToSend = [];

    estabBoxes.forEach(function(box) {
        const checkedItemChks = box.querySelectorAll('.item-checkbox:checked');
        if (checkedItemChks.length === 0) return;

        const orderId   = box.getAttribute('data-order-id');
        const estabName = (box.querySelector('.cart-establishment-info h2') || {}).textContent || '';
        const itemIds   = [];

        checkedItemChks.forEach(function(chk) {
            const id = chk.getAttribute('data-item-id');
            if (id) itemIds.push(id);
        });

        if (orderId && itemIds.length > 0) {
            ordersToSend.push({ orderId, estabName: estabName.trim(), itemIds, box });
        }
    });

    if (ordersToSend.length === 0) {
        showMessage('Please check at least one item to place an order.', 'warning');
        return;
    }

    // ── Final stock check before submitting ────────────────────────────────
    // Prevent sending if any checked item is out of stock or over-qty.
    // (The button should already be disabled by _updateCheckoutButtonStockState,
    // but this is a safety net in case the DOM state is inconsistent.)
    let stockBlockMsg = '';
    document.querySelectorAll('.item-checkbox:checked').forEach(function (chk) {
        if (stockBlockMsg) return;
        const itemId  = chk.getAttribute('data-item-id');
        const cartRow = document.getElementById('cart-item-' + itemId);
        if (!cartRow) return;
        const maxStock   = parseInt(cartRow.dataset.maxStock || '999', 10);
        const qtyEl      = cartRow.querySelector('.quantity-value');
        const currentQty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
        const itemName   = (cartRow.querySelector('.item-name') || {}).textContent || 'An item';
        if (maxStock <= 0) {
            stockBlockMsg = `"${itemName.trim()}" is out of stock. Remove it or uncheck it before sending.`;
        } else if (currentQty > maxStock) {
            stockBlockMsg = `"${itemName.trim()}" only has ${maxStock} left. Please reduce the quantity.`;
        }
    });
    if (stockBlockMsg) {
        showMessage('⚠ ' + stockBlockMsg, 'error');
        _updateCheckoutButtonStockState();
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }

    const csrfToken = getCookie('csrftoken');
    let idx = 0;
    const successBoxes = [];

    function sendNext() {
        if (idx >= ordersToSend.length) {
            // Remove only checked item rows; keep box if unchecked items remain
            successBoxes.forEach(function(box) {
                // Remove the checked item rows
                box.querySelectorAll('.item-checkbox:checked').forEach(function(chk) {
                    var row = chk.closest('.cart-item');
                    if (row) row.remove();
                });
                // Only remove whole box if no items remain
                var remaining = box.querySelectorAll('.cart-item');
                if (remaining.length === 0) {
                    box.style.transition = 'opacity 0.35s, transform 0.35s';
                    box.style.opacity    = '0';
                    box.style.transform  = 'translateX(30px)';
                    setTimeout(function() { box.remove(); }, 380);
                }
            });

            setTimeout(function() {
                if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                const modal = document.getElementById('orderRequestModal');
                if (modal) {
                    modal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                }
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Order Request';
                }
            }, 400);
            return;
        }

        const entry = ordersToSend[idx];
        idx++;

        const fd = new FormData();
        fd.append('order_id', entry.orderId);
        // Send ONLY the checked item IDs — backend creates a new order for these
        // and leaves unchecked items in the original PENDING cart order untouched
        entry.itemIds.forEach(function(id) { fd.append('selected_item_ids[]', id); });

        fetch('/payment/create-cash-order/', {
            method: 'POST',
            body: fd,
            headers: { 'X-CSRFToken': csrfToken },
            credentials: 'same-origin'
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                successBoxes.push(entry.box);
                sendNext();
            } else {
                throw new Error(data.message || 'Failed to send order for ' + entry.estabName);
            }
        })
        .catch(function(err) {
            console.error('Order request error:', err);
            showMessage('Error sending order for ' + entry.estabName + ': ' + err.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Order Request';
            }
        });
    }

    sendNext();
}
window.sendOrderRequest = sendOrderRequest;

function closeOrderRequestModal() {
    const modal = document.getElementById('orderRequestModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}
window.closeOrderRequestModal = closeOrderRequestModal;

// Keep proceedToCheckout as legacy alias
function proceedToCheckout() {
    sendOrderRequest();
}
window.proceedToCheckout = proceedToCheckout;

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

    const cartBox = checkbox.closest('.establishment-cart-box');
    if (cartBox) {
        updateEstabSelectAll(cartBox);
        // Dim establishment box if all items unchecked
        const anyChecked = cartBox.querySelectorAll('.item-checkbox:checked').length > 0;
        cartBox.classList.toggle('estab-unchecked', !anyChecked);
    }

    // ✅ Rebuild full summary realtime — covers ALL establishments
    if (window.rebuildOrderSummary) window.rebuildOrderSummary();
}
window.onItemCheckboxChange = onItemCheckboxChange;

// Called when establishment "Select All" checkbox changes
function toggleEstablishmentItems(selectAllCheckbox) {
    const cartBox = selectAllCheckbox.closest('.establishment-cart-box');
    if (!cartBox) return;

    const checked = selectAllCheckbox.checked;

    cartBox.querySelectorAll('.item-checkbox').forEach(function(cb) {
        cb.checked = checked;
        const cartItem = cb.closest('.cart-item');
        if (cartItem) cartItem.classList.toggle('item-unchecked', !checked);
    });

    cartBox.classList.toggle('estab-unchecked', !checked);

    // ✅ Rebuild full summary realtime — covers ALL establishments
    if (window.rebuildOrderSummary) window.rebuildOrderSummary();
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

// ============================================================
// ✅ REALTIME INVENTORY — WebSocket per establishment
// Subscribes to each establishment cart box on the page.
// When stock changes, warns user if their cart qty exceeds
// new available stock and updates the max on qty controls.
// ============================================================
(function initCartInventoryWs() {
    const cartInventoryWs = {};

    function subscribeCart(estId) {
        if (!estId || cartInventoryWs[estId]) return;
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${proto}://${location.host}/ws/inventory/${estId}/`);

        ws.onmessage = function (e) {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'quantity_update') applyCartInventoryUpdate(data.updates);
            } catch (_) {}
        };
        ws.onclose = function () {
            delete cartInventoryWs[estId];
            setTimeout(() => subscribeCart(estId), 3000);
        };
        ws.onerror = function () { ws.close(); };
        cartInventoryWs[estId] = ws;
    }

    function applyCartInventoryUpdate(updates) {
        updates.forEach(function ({ menu_item_id, new_quantity }) {
            const newQty = parseInt(new_quantity, 10);

            // Match rows via data-menu-item-id (set in cart.html template).
            // Fall back to the legacy id-based scan for older cached HTML.
            document.querySelectorAll('[id^="cart-item-"]').forEach(function (row) {
                const menuItemIdAttr = row.dataset.menuItemId
                    ? parseInt(row.dataset.menuItemId, 10)
                    : null;

                // Only process rows that belong to this menu item
                if (menuItemIdAttr !== null && menuItemIdAttr !== menu_item_id) return;

                const cartItemId = row.id.replace('cart-item-', '');
                const increaseBtn = document.querySelector(`.btn-increase[data-item-id="${cartItemId}"]`);
                const qtyEl       = document.querySelector(`.quantity-value[data-item-id="${cartItemId}"]`);

                if (!increaseBtn || !qtyEl) return;

                // Update the max-stock attribute and the visible "N available" count
                row.dataset.maxStock = newQty;
                const stockCountEl = row.querySelector('.stock-count');
                if (stockCountEl) stockCountEl.textContent = newQty;

                const currentCartQty = parseInt(qtyEl.textContent) || 1;

                if (newQty <= 0) {
                    // Out of stock — disable increase, dim row
                    increaseBtn.disabled = true;
                    increaseBtn.style.opacity = '0.4';
                    row.style.opacity = '0.6';
                    showCartStockWarning(row, 0);
                } else if (currentCartQty > newQty) {
                    // Cart qty exceeds new stock — clamp and warn
                    increaseBtn.disabled = false;
                    increaseBtn.style.opacity = '';
                    row.style.opacity = '';
                    updateQuantityRealTime(cartItemId, newQty);
                    showCartStockWarning(row, newQty);
                } else {
                    // Sufficient stock — clear any warning
                    increaseBtn.disabled = newQty <= currentCartQty;
                    increaseBtn.style.opacity = '';
                    row.style.opacity = '';
                    clearCartStockWarning(row);
                }
            });
        });
    }

    function showCartStockWarning(row, availableQty) {
        // Update or create the warning chip
        let warn = row.querySelector('.cart-stock-warn');
        if (!warn) {
            warn = document.createElement('div');
            warn.className = 'cart-stock-warn';
            warn.style.cssText = [
                'display:inline-flex', 'align-items:center', 'gap:5px',
                'font-size:11.5px', 'font-weight:700', 'padding:3px 9px',
                'border-radius:6px', 'margin-top:5px',
            ].join(';');
            const detailsEl = row.querySelector('.item-details');
            if (detailsEl) detailsEl.appendChild(warn);
            else row.appendChild(warn);
        }
        if (availableQty <= 0) {
            warn.style.background = '#FEE2E2';
            warn.style.color      = '#991B1B';
            warn.style.border     = '1px solid #FECACA';
            warn.innerHTML = '<i class="fas fa-times-circle"></i> Out of stock';
        } else {
            warn.style.background = '#FEF3C7';
            warn.style.color      = '#92400E';
            warn.style.border     = '1px solid #FDE68A';
            warn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Only ${availableQty} left`;
        }

        // Turn the "N available" line red/amber so it's immediately obvious
        const stockLine = row.querySelector('.item-stock');
        if (stockLine) {
            stockLine.style.color = availableQty <= 0 ? '#991B1B' : '#92400E';
        }

        // After any stock change, re-evaluate the checkout button state
        _updateCheckoutButtonStockState();
    }

    function clearCartStockWarning(row) {
        const warn = row.querySelector('.cart-stock-warn');
        if (warn) warn.remove();

        // Restore "N available" line to its original green colour
        const stockLine = row.querySelector('.item-stock');
        if (stockLine) stockLine.style.color = '';

        // Re-evaluate checkout button — might be clearable now
        _updateCheckoutButtonStockState();
    }

    // ── Evaluate all checked items for stock issues ──────────────────────────
    // Disables the Send Order Request button and shows a banner if any checked
    // item is out of stock or has fewer units available than the cart quantity.
    function _updateCheckoutButtonStockState() {
        const btn = document.getElementById('initial-checkout-btn');
        if (!btn) return;

        // Only scan checked items
        let hasIssue = false;
        let issueMsg = '';

        document.querySelectorAll('.item-checkbox:checked').forEach(function (chk) {
            const itemId  = chk.getAttribute('data-item-id');
            const cartRow = document.getElementById('cart-item-' + itemId);
            if (!cartRow) return;
            const maxStock      = parseInt(cartRow.dataset.maxStock || '999', 10);
            const qtyEl         = cartRow.querySelector('.quantity-value');
            const currentQty    = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
            const itemName      = (cartRow.querySelector('.item-name') || {}).textContent || 'An item';

            if (maxStock <= 0) {
                hasIssue = true;
                issueMsg = issueMsg || `"${itemName.trim()}" is out of stock — remove it or uncheck it to continue.`;
            } else if (currentQty > maxStock) {
                hasIssue = true;
                issueMsg = issueMsg || `"${itemName.trim()}" only has ${maxStock} left — adjust the quantity.`;
            }
        });

        // Update or create the global stock warning banner above the button
        const footer = document.getElementById('summary-footer');
        if (footer) {
            let banner = document.getElementById('cart-global-stock-banner');
            if (hasIssue) {
                if (!banner) {
                    banner = document.createElement('div');
                    banner.id = 'cart-global-stock-banner';
                    banner.style.cssText = [
                        'background:#FEF2F2', 'border:1.5px solid #FECACA',
                        'border-radius:8px', 'padding:9px 13px', 'margin-bottom:10px',
                        'font-size:12px', 'color:#7F1D1D', 'font-weight:600',
                        'display:flex', 'align-items:flex-start', 'gap:7px',
                    ].join(';');
                    // Insert above the checkout button
                    btn.before(banner);
                }
                banner.innerHTML = '<i class="fas fa-exclamation-triangle" style="margin-top:2px;flex-shrink:0;"></i><span>' + issueMsg + '</span>';
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor  = 'not-allowed';
                btn.title = 'Resolve stock issues before sending order';
            } else {
                if (banner) banner.remove();
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.cursor  = '';
                btn.title = '';
            }
        }
    }
    // Expose so cart.html inline code can call it after checkbox changes
    window._updateCheckoutButtonStockState = _updateCheckoutButtonStockState;

    // Subscribe to all establishment cart boxes present on the page
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.establishment-cart-box[data-establishment-id]').forEach(function (box) {
            subscribeCart(box.dataset.establishmentId);
        });
    });
})();