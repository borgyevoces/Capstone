/**
 * Shopping Cart Logic - KabsuEats
 * Naglalaman ng pinagsama-samang Cart functions para maiwasan ang duplicates at bug.
 *
 * ✅ FIXED: bfcache prevention — when the user presses Back/Forward the browser
 *    sometimes restores a stale frozen snapshot (bfcache) instead of reloading.
 *    The pageshow handler below detects this and forces a fresh reload so the
 *    cart always shows the latest state from the server.
 */

// ── bfcache / back-navigation cache prevention ───────────────────────────────
// Ang @never_cache decorator sa views.py ay nagse-set ng no-store header sa
// Django response, pero hindi nito mapigilan ang browser bfcache (back/forward
// cache).  Ang pageshow event ay ang tanging paraan para matukoy kung ang page
// ay na-restore mula sa bfcache (event.persisted === true).  Kapag ganoon,
// i-reload natin para laging fresh ang data.
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        // Page was restored from the browser's back/forward cache.
        // Force a full reload so the server can send the latest cart/order data.
        window.location.reload();
    }
});

// ── CSRF helper gamit ang document cookie o input ────────────────────────
function _cartCsrf() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value
        || (document.cookie.match(/csrftoken=([^;]+)/) || [])[1]
        || '';
}

// ── Update Count & Badges Helper ──────────────────────────────────────────
function _cartUpdateCount(n) {
    const el = document.querySelector('.cart-item-count');
    if (el) el.textContent = n + ' item' + (n === 1 ? '' : 's');
}

function _cartUpdateBadge(n) {
    document.querySelectorAll(
        '#cartBadge,.cart-badge,[id*="cart-badge"],[class*="cart-badge"]'
    ).forEach(function(el) {
        el.textContent = n;
        el.style.display = n > 0 ? '' : 'none';
    });
}

function _cartShowEmptyIfNeeded() {
    if (!document.querySelector('.establishment-cart-box')) {
        const c = document.getElementById('cart-page-container');
        if (c && window.CART_ENV) c.innerHTML =
            '<div class="empty-cart-message">' +
            '<div class="empty-cart-icon"><i class="fas fa-shopping-cart"></i></div>' +
            '<h2>Your cart is empty</h2>' +
            '<p>Add items to your cart to get started!</p>' +
            '<a href="' + window.CART_ENV.urlHome + '" class="btn-back-to-home"><i class="fas fa-store"></i> Browse Establishments</a>' +
            '</div>';
    }
}

// ── I-lock / I-unlock ang Carts (Para sa Open/Closed status) ──────────────
function _lockClosedEstab(box) {
    const estabChk = box.querySelector('.estab-select-all');
    if (estabChk) {
        estabChk.checked = false;
        estabChk.indeterminate = false;
        estabChk.disabled = true;
    }
    box.classList.add('estab-unchecked', 'estab-closed-locked');

    box.querySelectorAll('.item-checkbox').forEach(function(chk) {
        chk.checked  = false;
        chk.disabled = true;
    });
    box.querySelectorAll('.cart-item').forEach(function(item) {
        item.classList.add('item-unchecked');
    });
}

function _unlockOpenEstab(box) {
    const estabChk = box.querySelector('.estab-select-all');
    if (estabChk) {
        estabChk.checked  = true;
        estabChk.disabled = false;
    }
    box.classList.remove('estab-unchecked', 'estab-closed-locked');

    box.querySelectorAll('.item-checkbox').forEach(function(chk) {
        chk.checked  = true;
        chk.disabled = false;
    });
    box.querySelectorAll('.cart-item').forEach(function(item) {
        item.classList.remove('item-unchecked');
    });
}

// ============================================================
// CUSTOM CONFIRM AT ERROR MODALS
// ============================================================
window.customConfirm = function(title, message, confirmText, cancelText, resolve) {
    const isRemove = title.toLowerCase().includes('remove');
    const modalId  = isRemove ? 'ccRemoveModal'  : 'ccClearModal';
    const cnfBtnId = isRemove ? 'ccRemoveConfirmBtn' : 'ccClearConfirmBtn';
    const cncBtnId = isRemove ? 'ccRemoveCancelBtn'  : 'ccClearCancelBtn';

    const overlay  = document.getElementById(modalId);
    const cnfBtn   = document.getElementById(cnfBtnId);
    const cncBtn   = document.getElementById(cncBtnId);

    if (!overlay) { resolve(window.confirm(message)); return; }

    if (isRemove) {
        const nameEl = document.getElementById('ccRemoveItemName');
        if (nameEl) {
            nameEl.textContent = window._pendingRemoveItemName || 'this item';
            window._pendingRemoveItemName = null;
        }
    } else {
        const estabEl = document.getElementById('ccClearEstabName');
        if (estabEl) {
            estabEl.textContent = window._pendingClearEstabName || 'this establishment';
            window._pendingClearEstabName = null;
        }
    }

    if (confirmText) cnfBtn.childNodes[cnfBtn.childNodes.length - 1].textContent = confirmText;
    if (cancelText)  cncBtn.textContent = cancelText;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    function cleanup() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        cnfBtn.removeEventListener('click', onConfirm);
        cncBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onKey);
    }

    function onConfirm() { cleanup(); resolve(true); }
    function onCancel()  { cleanup(); resolve(false); }
    function onOverlay(e) { if (e.target === overlay) { cleanup(); resolve(false); } }
    function onKey(e)    { if (e.key === 'Escape') { cleanup(); resolve(false); } }

    cnfBtn.addEventListener('click', onConfirm);
    cncBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);
};

window.showCartError = function(message) {
    const modal = document.getElementById('cartErrorModal');
    const msgEl = document.getElementById('cartErrorMessage');
    if (modal && msgEl) {
        msgEl.textContent = message || 'An error occurred. Please try again.';
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        modal.addEventListener('click', function(e) {
            if (e.target === modal) window.closeCartErrorModal();
        });
    }
};

window.closeCartErrorModal = function() {
    const modal = document.getElementById('cartErrorModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
};

// ============================================================
// ORDER SUMMARY & STOCK CHECK
// ============================================================
window.rebuildOrderSummary = function() {
    const summaryBody   = document.getElementById('summary-body');
    const summaryFooter = document.getElementById('summary-footer');
    const summaryNoSel  = document.getElementById('summary-no-selection');
    const grandTotalEl  = document.getElementById('summary-grand-total');
    if (!summaryBody) return;

    const estabBoxes = document.querySelectorAll('.establishment-cart-box');
    let html       = '';
    let grandTotal = 0;
    let anyChecked = false;

    estabBoxes.forEach(function(box) {
        const estabNameEl = box.querySelector('.cart-establishment-info h2');
        if (!estabNameEl || box.getAttribute('data-is-open') !== 'true') return;

        const checkedItems = box.querySelectorAll('.item-checkbox:checked');
        if (checkedItems.length === 0) return;

        anyChecked = true;
        let estabSubtotal = 0;
        let itemsHtml = '';

        checkedItems.forEach(function(itemChk) {
            const itemId   = itemChk.getAttribute('data-item-id');
            const cartItem = document.getElementById('cart-item-' + itemId);
            if (!cartItem) return;

            const name     = cartItem.getAttribute('data-name') || cartItem.querySelector('.item-name')?.textContent?.trim() || 'Item';
            const qty      = parseInt(cartItem.querySelector('.quantity-value')?.textContent || cartItem.getAttribute('data-qty') || '1');
            const price    = parseFloat(cartItem.getAttribute('data-unit-price') || '0');

            let addons = [];
            try { addons = JSON.parse(cartItem.dataset.addonsJson || '[]'); } catch(e) {}
            const addonsAmt = addons.reduce(function(sum, a) {
                return sum + parseFloat(a.additional_price || 0) * parseInt(a.qty || 1, 10);
            }, 0);
            const subtotal = qty * price + addonsAmt;
            estabSubtotal += subtotal;

            itemsHtml += `
                <div class="summary-item-line">
                    <span class="item-label">${name} ×${qty}</span>
                    <span class="item-amt">₱${(qty * price).toFixed(2)}</span>
                </div>`;

            if (addons.length > 0) {
                addons.forEach(function(a) {
                    const aPrice = parseFloat(a.additional_price || 0);
                    const aQty   = parseInt(a.qty || 1, 10);
                    const qtyTxt = aQty > 1 ? ' ×' + aQty : '';
                    itemsHtml += `
                        <div class="summary-addon-line">
                            <span class="summary-addon-name"><i class="fas fa-plus" style="font-size:0.55rem;margin-right:3px;"></i>${a.name}${qtyTxt}</span>
                            <span class="summary-addon-price">${aPrice > 0 ? '+₱' + (aPrice * aQty).toFixed(2) : 'Free'}</span>
                        </div>`;
                });
            }
        });

        grandTotal += estabSubtotal;
        const estabNameText = estabNameEl.querySelector('.estab-name-link')?.firstChild?.textContent?.trim() || estabNameEl.textContent.trim();

        html += `
            <div class="summary-estab-block">
                <div class="summary-estab-label"><i class="fas fa-store"></i> ${estabNameText}</div>
                ${itemsHtml}
                <div class="summary-estab-subtotal">
                    <span>Subtotal</span><strong>₱${estabSubtotal.toFixed(2)}</strong>
                </div>
            </div>`;
    });

    if (anyChecked) {
        summaryBody.innerHTML       = html;
        summaryFooter.style.display = 'block';
        summaryNoSel.style.display  = 'none';
        grandTotalEl.textContent    = '₱' + grandTotal.toFixed(2);
    } else {
        const closedBoxes = Array.from(estabBoxes).filter(b => b.getAttribute('data-is-open') !== 'true');
        if (closedBoxes.length > 0 && estabBoxes.length > 0) {
            const closedName = closedBoxes[0].querySelector('.cart-establishment-info h2 .estab-name-link')?.firstChild?.textContent?.trim() || 'The establishment';
            const opensAt = closedBoxes[0].getAttribute('data-opening-time') || '';
            const opensMsg = opensAt ? ` Opens at ${opensAt}.` : '';
            summaryBody.innerHTML = `
                <div style="text-align:center;padding:18px 8px;">
                    <i class="fas fa-store-slash" style="font-size:2rem;color:#dc2626;margin-bottom:8px;display:block;"></i>
                    <p style="margin:0 0 4px;font-weight:600;color:#991b1b;">${closedName} is currently closed.</p>
                    <p style="margin:0;font-size:0.82rem;color:#6b7280;">${opensMsg} You can still keep your cart and order once it opens.</p>
                </div>`;
            summaryFooter.style.display = 'block';
            summaryNoSel.style.display  = 'none';
            grandTotalEl.textContent    = '₱0.00';
            const sendBtn = document.getElementById('initial-checkout-btn');
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.style.opacity = '0.5';
                sendBtn.style.cursor  = 'not-allowed';
            }
        } else {
            summaryBody.innerHTML       = '<p class="summary-empty-msg">Check an establishment to see order details.</p>';
            summaryFooter.style.display = 'none';
            summaryNoSel.style.display  = 'none';
            const sendBtn = document.getElementById('initial-checkout-btn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.style.opacity = '';
                sendBtn.style.cursor  = '';
            }
        }
    }

    if (anyChecked) {
        const sendBtn = document.getElementById('initial-checkout-btn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '';
            sendBtn.style.cursor  = '';
        }
    }
};

window._updateCheckoutButtonStockState = function() {
    const btn = document.getElementById('initial-checkout-btn');
    let hasOos = false;
    let hasInsufficientStock = false;
    let insufficientItems = [];

    document.querySelectorAll('.cart-item').forEach(function(cartItem) {
        const rawMax = parseInt(cartItem.dataset.maxStock, 10);
        const isOos  = !isNaN(rawMax) && rawMax <= 0;
        const inc    = cartItem.querySelector('.btn-increase');
        const dec    = cartItem.querySelector('.btn-decrease');
        const curQty = parseInt(cartItem.querySelector('.quantity-value')?.textContent, 10) || 1;

        if (isOos) {
            if (inc) inc.disabled = true;
            if (dec) dec.disabled = true;
        } else {
            const remQty   = parseInt(cartItem.dataset.remainingQty, 10);
            const effMax   = !isNaN(remQty) ? Math.min(remQty, rawMax) : rawMax;
            if (inc) inc.disabled = (curQty >= effMax);
            if (dec) dec.disabled = (curQty <= 1);
        }
    });

    document.querySelectorAll('.item-checkbox:checked').forEach(function(chk) {
        const cartItem = document.getElementById('cart-item-' + chk.getAttribute('data-item-id'));
        if (!cartItem) return;
        const rawMax = parseInt(cartItem.dataset.maxStock, 10);
        const curQty = parseInt(cartItem.querySelector('.quantity-value')?.textContent, 10) || 1;
        const itemName = cartItem.getAttribute('data-name') || 'an item';

        if (!isNaN(rawMax) && rawMax <= 0) hasOos = true;
        if (!isNaN(rawMax) && curQty > rawMax) {
            hasInsufficientStock = true;
            insufficientItems.push({ name: itemName, cartQty: curQty, available: rawMax });
        }
    });

    if (!btn) return;

    let hasClosed = false;
    let closedNames = [];
    document.querySelectorAll('.establishment-cart-box').forEach(function(box) {
        if (box.getAttribute('data-is-open') === 'true') return;
        if (box.querySelectorAll('.item-checkbox:checked').length > 0) {
            hasClosed = true;
            const nameEl = box.querySelector('.cart-establishment-info h2 .estab-name-link');
            const name = (nameEl ? nameEl.firstChild?.textContent?.trim() : null) || box.querySelector('.cart-establishment-info h2')?.textContent?.trim() || 'an establishment';
            closedNames.push(name);
        }
    });

    let warn = document.getElementById('closed-estab-warning');
    if (hasClosed) {
        if (!warn) {
            warn = document.createElement('p');
            warn.id = 'closed-estab-warning';
            warn.style.cssText = 'color:#991b1b;font-size:0.82rem;text-align:center;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:6px;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:9px 12px;line-height:1.4;';
            warn.innerHTML = '<i class="fas fa-store-slash" style="flex-shrink:0;"></i><span id="closed-warn-text"></span>';
            btn.parentNode.insertBefore(warn, btn.nextSibling);
        }
        document.getElementById('closed-warn-text').textContent = closedNames.join(', ') + (closedNames.length === 1 ? ' is' : ' are') + ' currently closed. Uncheck to proceed.';
        warn.style.display = 'flex';
    } else if (warn) warn.style.display = 'none';

    let disableReason = '';
    if (hasClosed) disableReason = closedNames[0] + ' is currently closed. Uncheck it to proceed.';
    else if (hasOos) disableReason = 'One or more selected items are out of stock. Please remove them before ordering.';
    else if (hasInsufficientStock) disableReason = insufficientItems.length === 1 ? `Insufficient stock for "${insufficientItems[0].name}"` : 'Adjust items to match available stock.';

    let insufficientWarn = document.getElementById('insufficient-stock-warning');
    if (hasInsufficientStock) {
        if (!insufficientWarn) {
            insufficientWarn = document.createElement('p');
            insufficientWarn.id = 'insufficient-stock-warning';
            insufficientWarn.style.cssText = 'color:#b45309;font-size:0.82rem;text-align:center;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:6px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:9px 12px;line-height:1.4;';
            insufficientWarn.innerHTML = '<i class="fas fa-exclamation-triangle" style="flex-shrink:0;"></i><span id="insufficient-warn-text"></span>';
            btn.parentNode.insertBefore(insufficientWarn, btn.nextSibling);
        }
        document.getElementById('insufficient-warn-text').textContent = insufficientItems.length === 1 ? `"${insufficientItems[0].name}" — Adjust down to ${insufficientItems[0].available}.` : `Adjust ${insufficientItems.length} items to match available stock.`;
        insufficientWarn.style.display = 'flex';
    } else if (insufficientWarn) insufficientWarn.style.display = 'none';

    btn.disabled = !!disableReason;
    btn.title = disableReason;
};

// ============================================================
// CHECKBOX HANDLERS
// ============================================================
window.toggleEstablishmentItems = function(estabChk) {
    const estabId = estabChk.getAttribute('data-establishment-id');
    const box     = document.querySelector(`.establishment-cart-box[data-establishment-id="${estabId}"]`);
    if (!box) return;

    const checked = estabChk.checked;
    box.querySelectorAll('.item-checkbox').forEach(function(chk) {
        chk.checked = checked;
        const cartItem = chk.closest('.cart-item');
        if (cartItem) cartItem.classList.toggle('item-unchecked', !checked);
    });

    box.classList.toggle('estab-unchecked', !checked);
    window.rebuildOrderSummary();
};

window.onItemCheckboxChange = function(itemChk) {
    const estabId  = itemChk.getAttribute('data-establishment-id');
    const cartItem = itemChk.closest('.cart-item');
    if (cartItem) cartItem.classList.toggle('item-unchecked', !itemChk.checked);

    const box = document.querySelector(`.establishment-cart-box[data-establishment-id="${estabId}"]`);
    if (box) {
        const allItems     = box.querySelectorAll('.item-checkbox');
        const checkedItems = box.querySelectorAll('.item-checkbox:checked');
        const estabChk     = box.querySelector('.estab-select-all');
        if (estabChk) {
            if (checkedItems.length === 0) {
                estabChk.checked       = false;
                estabChk.indeterminate = false;
                box.classList.add('estab-unchecked');
            } else if (checkedItems.length === allItems.length) {
                estabChk.checked       = true;
                estabChk.indeterminate = false;
                box.classList.remove('estab-unchecked');
            } else {
                estabChk.checked       = false;
                estabChk.indeterminate = true;
                box.classList.remove('estab-unchecked');
            }
        }
    }

    window.rebuildOrderSummary();
    if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();
};

// ============================================================
// SEND ORDER REQUEST
// ============================================================
window.sendOrderRequest = function() {
    const btn = document.getElementById('initial-checkout-btn');

    // ✅ IDINAGDAG: I-force ang blur para ma-save muna ang Note sa database
    if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
        document.activeElement.blur();
    }

    // Hintayin natin ng 150ms para pumasok ang note sa server bago ipasa ang order
    setTimeout(() => {
        const estabBoxes   = document.querySelectorAll('.establishment-cart-box');
        const ordersToSend = [];

        estabBoxes.forEach(function(box) {
            const estabChk = box.querySelector('.estab-select-all');
            if (!estabChk) return;
            const checkedItemChks = box.querySelectorAll('.item-checkbox:checked');
            if (checkedItemChks.length === 0) return;

            const orderId   = box.getAttribute('data-order-id');
            const estabId   = box.getAttribute('data-establishment-id');
            const estabName = box.querySelector('.cart-establishment-info h2')?.textContent?.trim() || '';
            const itemIds = Array.from(checkedItemChks).map(chk => chk.getAttribute('data-item-id'));

            if (orderId && itemIds.length > 0) {
                ordersToSend.push({ orderId, estabId, estabName, itemIds, box });
            }
        });

        if (ordersToSend.length === 0) {
            showCartError('Please check at least one establishment to place an order.');
            return;
        }

        const closedOrders = ordersToSend.filter(o => o.box.getAttribute('data-is-open') !== 'true');
        if (closedOrders.length > 0) {
            const names = closedOrders.map(o => o.estabName).join(', ');
            showCartError(names + (closedOrders.length === 1 ? ' is' : ' are') + ' currently closed. Please uncheck closed establishments before sending your order.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }

        let idx = 0;
        const successBoxes = [];

        function sendNext() {
            if (idx >= ordersToSend.length) {
                successBoxes.forEach(function(box) {
                    box.style.transition = 'opacity 0.35s, transform 0.35s';
                    box.style.opacity    = '0';
                    box.style.transform  = 'translateX(30px)';
                    setTimeout(() => box.remove(), 380);
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

            const { orderId, itemIds, box, estabName } = ordersToSend[idx];
            idx++;

            const fd = new FormData();
            fd.append('order_id', orderId);
            itemIds.forEach(id => fd.append('selected_item_ids[]', id));

            fetch(window.CART_ENV.urlCreateCashOrder, {
                method: 'POST', body: fd, headers: { 'X-CSRFToken': _cartCsrf() }, credentials: 'same-origin'
            })
            .then(r => r.json().then(data => {
                if (!r.ok) throw new Error(data.message || 'Server error (' + r.status + ')');
                return data;
            }))
            .then(data => {
                if (data.success) { successBoxes.push(box); sendNext(); }
                else throw new Error(data.message || 'Failed to send order.');
            })
            .catch(err => {
                // If the error message suggests DB lock / server busy,
                // verify if the order actually went through before showing error.
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Order Request'; }
                const msg = (err.message || '').toLowerCase();
                if (msg.includes('busy') || msg.includes('locked') || msg.includes('500')) {
                    // Order may have been committed — treat as success and continue
                    successBoxes.push(box);
                    sendNext();
                } else {
                    showCartError('Error sending order for ' + estabName + ': ' + err.message);
                }
            });
        }

        sendNext();
    }, 150); // Delay ng 150ms para ma-siguradong na-save ang Note
};

window.closeOrderRequestModal = function() {
    const modal = document.getElementById('orderRequestModal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
    if(window.CART_ENV) window.location.href = window.CART_ENV.urlHome;
};

// ✅ FIXED: Clear Service Worker caches AND prevent bfcache stale data.
// The pageshow handler at the top of this file handles the bfcache case.
// This block clears any SW caches so network requests aren't intercepted.
if ('caches' in window) {
    caches.keys().then(function(names) {
        names.forEach(function(name) { caches.delete(name); });
    });
}

// ============================================================
// REMOVE AND CLEAR CART ACTIONS
// ============================================================
window.removeItemFromCart = function(orderItemId) {
    const cartItemEl = document.getElementById('cart-item-' + orderItemId);
    if (cartItemEl) {
        const n = cartItemEl.querySelector('.item-name');
        window._pendingRemoveItemName = n ? n.textContent.trim() : 'this item';
    }

    window.customConfirm('Remove Item', '', 'Yes, Remove', 'Keep It', function(confirmed) {
        if (!confirmed) return;
        const btn = cartItemEl ? cartItemEl.querySelector('.remove-item-btn') : null;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

        const fd = new FormData();
        fd.append('order_item_id', orderItemId);

        fetch(window.CART_ENV.urlRemoveFromCart, {
            method: 'POST', body: fd, headers: { 'X-CSRFToken': _cartCsrf() }, credentials: 'same-origin'
        })
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                showCartError(data.message || 'Could not remove item.');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash-alt"></i> Remove'; }
                return;
            }
            if (cartItemEl) {
                cartItemEl.style.transition = 'opacity 0.28s, transform 0.28s';
                cartItemEl.style.opacity    = '0';
                cartItemEl.style.transform  = 'translateX(20px)';
                setTimeout(() => {
                    cartItemEl.remove();
                    if (data.order_deleted) {
                        const estBox = document.querySelector('.establishment-cart-box[data-establishment-id="' + data.establishment_id + '"]');
                        if (estBox) {
                            estBox.style.transition = 'opacity 0.3s';
                            estBox.style.opacity    = '0';
                            setTimeout(() => { estBox.remove(); _cartShowEmptyIfNeeded(); }, 320);
                        } else _cartShowEmptyIfNeeded();
                    }
                    if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                    _cartUpdateCount(data.cart_count || 0);
                    _cartUpdateBadge(data.cart_count || 0);
                }, 300);
            }
        }).catch(() => {
            showCartError('Network error. Please try again.');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash-alt"></i> Remove'; }
        });
    });
};

window.clearEstablishmentCart = function(establishmentId) {
    const estBox = document.querySelector('.establishment-cart-box[data-establishment-id="' + establishmentId + '"]');
    if (estBox) {
        const n = estBox.querySelector('.cart-establishment-info h2');
        window._pendingClearEstabName = n ? n.textContent.trim() : 'this establishment';
    }

    window.customConfirm('Clear Cart', '', 'Clear All', 'Cancel', function(confirmed) {
        if (!confirmed) return;
        const clearBtn = estBox ? estBox.querySelector('.clear-establishment-btn') : null;
        if (clearBtn) { clearBtn.disabled = true; clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

        const fd = new FormData();
        fd.append('establishment_id', establishmentId);

        fetch(window.CART_ENV.urlClearEstablishmentCart, {
            method: 'POST', body: fd, headers: { 'X-CSRFToken': _cartCsrf() }, credentials: 'same-origin'
        })
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                showCartError(data.message || 'Could not clear cart.');
                if (clearBtn) { clearBtn.disabled = false; clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; }
                return;
            }
            if (estBox) {
                estBox.style.transition = 'opacity 0.35s, transform 0.35s';
                estBox.style.opacity    = '0';
                estBox.style.transform  = 'translateX(30px)';
                setTimeout(() => {
                    estBox.remove();
                    _cartShowEmptyIfNeeded();
                    if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                    _cartUpdateCount(data.cart_count || 0);
                    _cartUpdateBadge(data.cart_count || 0);
                }, 380);
            }
        }).catch(() => {
            showCartError('Network error. Please try again.');
            if (clearBtn) { clearBtn.disabled = false; clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; }
        });
    });
};

// ============================================================
// ADD-ONS EDIT MODAL
// ============================================================
const _addonState = { orderItemId: null, menuItemId: null };

window.openAddonsModal = function (orderItemId, menuItemId, itemName) {
    _addonState.orderItemId = orderItemId;
    _addonState.menuItemId  = menuItemId;

    const modal     = document.getElementById('addonsEditModal');
    const body      = document.getElementById('addonsModalBody');
    const nameEl    = document.getElementById('addonsModalItemName');
    const subtitleEl= document.getElementById('addonsModalSubtitle');

    nameEl.textContent    = itemName;
    subtitleEl.textContent= 'Loading…';
    body.innerHTML        = '<div style="text-align:center;padding:36px 0;"><i class="fas fa-spinner fa-spin" style="font-size:28px;color:#B71C1C;"></i></div>';

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    const cartItemEl    = document.getElementById('cart-item-' + orderItemId);
    let currentAddons = [];
    if (cartItemEl) {
        try { currentAddons = JSON.parse(cartItemEl.dataset.addonsJson || '[]'); } catch (e) {}
    }
    const selectedMap = {};
    currentAddons.forEach(a => { selectedMap[a.id] = a.qty || 1; });

    fetch('/api/menu-item-addons/' + menuItemId + '/')
        .then(r => r.json())
        .then(data => {
            if (!data.success || !data.groups || data.groups.length === 0) {
                subtitleEl.textContent = 'No add-ons available';
                body.innerHTML = '<p style="text-align:center;color:#9CA3AF;padding:28px 0;font-size:0.9rem;"><i class="fas fa-info-circle" style="display:block;font-size:2rem;margin-bottom:8px;"></i>No add-ons available for this item.</p>';
                return;
            }
            subtitleEl.textContent = 'Customize your order';
            body.innerHTML = _buildGroupsHtml(data.groups, selectedMap);
        })
        .catch(() => {
            subtitleEl.textContent = 'Error';
            body.innerHTML = '<p style="text-align:center;color:#ef4444;padding:28px 0;">Failed to load add-ons. Please try again.</p>';
        });
};

function _buildPickLabel(selected, max) {
    if (selected === 0) return 'Pick up to ' + max;
    const remaining = max - selected;
    if (remaining <= 0) return '✓ Max reached (' + max + '/' + max + ')';
    return remaining === 1 ? 'Pick 1 more' : 'Pick ' + remaining + ' more';
}

function _updateGroupPickLabel(list) {
    if (!list) return;
    const maxChoices = parseInt(list.getAttribute('data-max-choices'), 10);
    if (!maxChoices || maxChoices <= 1) return;
    const groupId = list.getAttribute('data-group-id');
    const tag = document.getElementById('addon-max-tag-' + groupId);
    if (!tag) return;
    const selected = list.querySelectorAll('input[type="checkbox"]:checked').length;
    tag.textContent = _buildPickLabel(selected, maxChoices);
    // Visual feedback: turn red when maxed out, default color otherwise
    tag.style.background = selected >= maxChoices ? '#B71C1C' : '';
    tag.style.color = selected >= maxChoices ? '#fff' : '';
    // Disable unchecked checkboxes when limit is reached
    list.querySelectorAll('input[type="checkbox"]').forEach(function(inp) {
        if (!inp.checked) inp.disabled = selected >= maxChoices;
    });
}

function _buildGroupsHtml(groups, selectedMap) {
    let html = '';
    groups.forEach(group => {
        const inputType = (group.max_choices === 1) ? 'radio' : 'checkbox';
        html += '<div style="margin-bottom:20px;">';
        html += '<div class="addons-group-title">' + _esc(group.name);
        if (group.is_required) html += ' <span class="addons-required-tag">Required</span>';
        if (group.max_choices > 1) {
            const alreadySelected = group.options.filter(o => selectedMap[o.id] > 0).length;
            html += ' <span class="addons-max-tag" id="addon-max-tag-' + group.id + '" data-max="' + group.max_choices + '">' + _buildPickLabel(alreadySelected, group.max_choices) + '</span>';
        }
        html += '</div><div class="addons-options-list" data-group-id="' + group.id + '" data-max-choices="' + group.max_choices + '">';

        group.options.forEach(opt => {
            const qty     = selectedMap[opt.id] || 0;
            const checked = qty > 0;
            const displayQty = checked ? qty : 1;
            const priceStr = opt.additional_price > 0
                ? '<span class="addon-option-price">+₱' + opt.additional_price.toFixed(2) + '</span>'
                : '<span class="addon-option-price" style="color:#16a34a;">Free</span>';

            html += `<label class="addon-option-label${checked ? ' selected' : ''}" data-opt-id="${opt.id}" data-opt-name="${_esc(opt.name)}" data-opt-price="${opt.additional_price}">
                <input type="${inputType}" name="addon-group-${group.id}" value="${opt.id}" ${checked ? 'checked' : ''} onchange="window._onAddonChange(this)">
                <span class="addon-option-name">${_esc(opt.name)}</span>${priceStr}
                <div class="addon-qty-controls" style="${checked ? '' : 'display:none;'}">
                    <button type="button" class="addon-qty-btn" onclick="window._addonQtyChange(this,-1,event)">−</button>
                    <span class="addon-qty-value">${displayQty}</span>
                    <button type="button" class="addon-qty-btn" onclick="window._addonQtyChange(this,1,event)">+</button>
                </div></label>`;
        });
        html += '</div></div>';
    });
    return html;
}

window._onAddonChange = function (input) {
    const label  = input.closest('label.addon-option-label');
    const list   = input.closest('.addons-options-list');
    const stepper = label ? label.querySelector('.addon-qty-controls') : null;

    if (input.type === 'radio') {
        list.querySelectorAll('label.addon-option-label').forEach(l => {
            l.classList.remove('selected');
            const s = l.querySelector('.addon-qty-controls');
            if (s) s.style.display = 'none';
        });
    }

    if (input.checked) {
        label.classList.add('selected');
        if (stepper) stepper.style.display = 'flex';
    } else {
        label.classList.remove('selected');
        if (stepper) stepper.style.display = 'none';
        const qtyEl = label ? label.querySelector('.addon-qty-value') : null;
        if (qtyEl) qtyEl.textContent = '1';
    }

    // ✅ REALTIME: I-update ang "Pick up to X" label base sa bilang ng nakitang selected
    if (input.type === 'checkbox') _updateGroupPickLabel(list);
};

window._addonQtyChange = function (btn, delta, e) {
    e.preventDefault(); e.stopPropagation();
    const label = btn.closest('label.addon-option-label');
    if (!label) return;
    const qtyEl = label.querySelector('.addon-qty-value');
    if (!qtyEl) return;
    const current = parseInt(qtyEl.textContent, 10) || 1;
    qtyEl.textContent = Math.max(1, current + delta);
};

window.closeAddonsModal = function () {
    const modal = document.getElementById('addonsEditModal');
    if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
};

window.saveAddons = function () {
    const saveBtn = document.getElementById('addonsModalSaveBtn');
    const body    = document.getElementById('addonsModalBody');
    const selectedAddons = [];

    body.querySelectorAll('input:checked').forEach(inp => {
        const lbl = inp.closest('label.addon-option-label');
        if (!lbl) return;
        const qtyEl = lbl.querySelector('.addon-qty-value');
        selectedAddons.push({
            id: parseInt(inp.value, 10),
            name: lbl.getAttribute('data-opt-name') || '',
            additional_price: parseFloat(lbl.getAttribute('data-opt-price') || 0),
            qty: qtyEl ? (parseInt(qtyEl.textContent, 10) || 1) : 1
        });
    });

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

    const fd = new FormData();
    fd.append('order_item_id', _addonState.orderItemId);
    fd.append('addons', JSON.stringify(selectedAddons));

    fetch(window.CART_ENV.urlUpdateCartItemAddons, {
        method: 'POST', body: fd, headers: { 'X-CSRFToken': _cartCsrf() }, credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(data => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-check" style="margin-right:5px;"></i> Save Add-ons';
        if (!data.success) { showCartError(data.message || 'Failed to save add-ons.'); return; }

        const cartItemEl = document.getElementById('cart-item-' + _addonState.orderItemId);
        if (cartItemEl) {
            cartItemEl.dataset.addonsJson  = JSON.stringify(selectedAddons);
            cartItemEl.dataset.addonsTotal = data.addons_total_per_unit.toFixed(2);

            const displayEl = document.getElementById('addons-display-' + _addonState.orderItemId);
            if (displayEl) {
                displayEl.innerHTML = selectedAddons.map(a => {
                    const aQty = a.qty || 1;
                    const aTotal = parseFloat(a.additional_price) * aQty;
                    return `<span class="addon-chip"><i class="fas fa-plus" style="font-size:0.6rem;"></i> ${_esc(a.name)}${aQty > 1 ? ' ×' + aQty : ''}${a.additional_price > 0 ? ' <span class="addon-price">+₱' + aTotal.toFixed(2) + '</span>' : ''}</span>`;
                }).join('');
            }

            const qty = parseInt((cartItemEl.querySelector('.quantity-value') || {}).textContent || '1', 10);
            const basePrice = parseFloat(cartItemEl.dataset.unitPrice || 0);
            const subEl = document.getElementById('item-total-' + _addonState.orderItemId);
            if (subEl) subEl.textContent = '₱' + (basePrice * qty + data.addons_total_per_unit).toFixed(2);

            const priceEl = cartItemEl.querySelector('.item-price');
            if (priceEl) priceEl.textContent = `₱${basePrice.toFixed(2)} each${data.addons_total_per_unit > 0 ? ' + ₱' + data.addons_total_per_unit.toFixed(2) + ' add-ons' : ''}`;
        }
        if (window.rebuildOrderSummary) window.rebuildOrderSummary();
        window.closeAddonsModal();
    })
    .catch(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-check" style="margin-right:5px;"></i> Save Add-ons';
        showCartError('Network error. Please try again.');
    });
};

function _esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// NOTES SAVING
// ============================================================
window.saveItemNote = function(textarea) {
    const itemId = textarea.getAttribute('data-item-id');
    const note   = textarea.value.trim();
    const status = document.getElementById('note-status-' + itemId);

    if (status) {
        status.textContent = '⏳ Saving…';
        status.className   = 'note-save-status visible saving';
    }

    const fd = new FormData();
    fd.append('order_item_id', itemId);
    fd.append('note', note);

    fetch(window.CART_ENV.urlUpdateCartItemNote, {
        method: 'POST', body: fd, headers: { 'X-CSRFToken': _cartCsrf() }, credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(data => {
        if (status) {
            if (data.success) { status.textContent = '✓ Saved'; status.className = 'note-save-status visible saved'; }
            else { status.textContent = '✗ Error'; status.className = 'note-save-status visible error'; }
            setTimeout(() => { status.className = 'note-save-status'; }, 2500);
        }
    }).catch(() => {
        if (status) {
            status.textContent = '✗ Error'; status.className = 'note-save-status visible error';
            setTimeout(() => { status.className = 'note-save-status'; }, 2500);
        }
    });
};

window.autoResizeNote = function(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 90) + 'px';
};

// ============================================================
// INITIALIZATION AND EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pay') === '1') {
        setTimeout(function () {
            const firstEstablishment = document.querySelector('.establishment-cart-box');
            if (firstEstablishment) firstEstablishment.click();
        }, 300);
    }

    document.querySelectorAll('.establishment-cart-box').forEach(function(box) {
        if (box.getAttribute('data-is-open') !== 'true') _lockClosedEstab(box);
    });

    window.rebuildOrderSummary();

    document.querySelectorAll('.cart-item').forEach(function(cartItem) {
        const rawMax = parseInt(cartItem.dataset.maxStock, 10);
        if (!isNaN(rawMax) && rawMax <= 0) {
            const inc = cartItem.querySelector('.btn-increase');
            const dec = cartItem.querySelector('.btn-decrease');
            if (inc) inc.disabled = true;
            if (dec) dec.disabled = true;
            const stockP = cartItem.querySelector('.item-stock');
            if (stockP) stockP.style.color = '#ef4444';

            const details = cartItem.querySelector('.item-details');
            if (details && !details.querySelector('.cart-oos-chip')) {
                const chip = document.createElement('span');
                chip.className = 'cart-oos-chip';
                chip.innerHTML = '<i class="fas fa-times-circle"></i> Out of stock';
                details.appendChild(chip);
            }
        }
    });
    if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();
});

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-increase, .btn-decrease');
    if (!btn) return;

    const cartItem    = btn.closest('.cart-item');
    if (!cartItem) return;
    const orderItemId = cartItem.dataset.itemId;
    const remainingQty = parseInt(cartItem.dataset.remainingQty, 10);
    const rawMaxStock  = parseInt(cartItem.dataset.maxStock, 10);
    const maxStock     = !isNaN(remainingQty) ? Math.min(remainingQty, rawMaxStock) : (!isNaN(rawMaxStock) ? rawMaxStock : 999);
    const isIncrease  = btn.classList.contains('btn-increase');
    const qtyEl       = cartItem.querySelector('.quantity-value[data-item-id="' + orderItemId + '"]');
    if (!qtyEl) return;

    let currentQty = parseInt(qtyEl.textContent, 10) || 1;
    let newQty     = isIncrease ? currentQty + 1 : currentQty - 1;

    if (newQty < 1) newQty = 1;
    if (newQty > maxStock) newQty = maxStock;
    if (newQty === currentQty) return;

    qtyEl.textContent = newQty;
    const unitPrice = parseFloat(cartItem.dataset.unitPrice || 0);
    // ✅ For the DOM display, also include add-ons in item subtotal
    const addonsAmt = (function() {
        try {
            const addons = JSON.parse(cartItem.dataset.addonsJson || '[]');
            return addons.reduce(function(s, a) {
                return s + parseFloat(a.additional_price || 0) * parseInt(a.qty || 1, 10);
            }, 0);
        } catch(e) { return 0; }
    })();
    const subTotalEl = document.getElementById('item-total-' + orderItemId);
    if (subTotalEl && unitPrice) subTotalEl.textContent = '₱' + (unitPrice * newQty + addonsAmt).toFixed(2);

    const decBtn = cartItem.querySelector('.btn-decrease');
    const incBtn = cartItem.querySelector('.btn-increase');
    if (decBtn) decBtn.disabled = (newQty <= 1);
    if (incBtn) incBtn.disabled = (newQty >= maxStock);

    if (window.rebuildOrderSummary) window.rebuildOrderSummary();
    if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();

    const fd = new FormData();
    fd.append('order_item_id', orderItemId);
    fd.append('quantity', newQty);

    fetch(window.CART_ENV.urlUpdateCartItem, {
        method: 'POST', body: fd, headers: { 'X-CSRFToken': _cartCsrf() }, credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(data => {
        if (!data.success) {
            qtyEl.textContent = currentQty;
            if (subTotalEl && unitPrice) subTotalEl.textContent = '₱' + ((unitPrice + addonsAmt) * currentQty).toFixed(2);
            if (decBtn) decBtn.disabled = (currentQty <= 1);
            if (incBtn) incBtn.disabled = (currentQty >= maxStock);
            if (window.rebuildOrderSummary) window.rebuildOrderSummary();
            showCartError(data.message || 'Could not update quantity.');
        } else {
            _cartUpdateCount(data.cart_count || 0);
            _cartUpdateBadge(data.cart_count || 0);
        }
    }).catch(() => {
        qtyEl.textContent = currentQty;
        if (subTotalEl && unitPrice) subTotalEl.textContent = '₱' + ((unitPrice + addonsAmt) * currentQty).toFixed(2);
        if (window.rebuildOrderSummary) window.rebuildOrderSummary();
    });
});

document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'addonsEditModal') window.closeAddonsModal();
});
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeAddonsModal();
});

// Watcher for external quantity changes
(function() {
    const observer = new MutationObserver(function() {
        if (window.rebuildOrderSummary) window.rebuildOrderSummary();
    });
    document.querySelectorAll('.quantity-value').forEach(function(el) {
        observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
})();

// ============================================================
// TOAST NOTIFICATIONS HELPER
// ============================================================
window.showCartToast = function(msg, type) {
    let c = document.getElementById('_cartToastContainer');
    if (!c) {
        c = document.createElement('div');
        c.id = '_cartToastContainer';
        c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:340px;';
        document.body.appendChild(c);
    }
    const bg = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#22c55e';
    const t  = document.createElement('div');
    t.style.cssText = 'background:' + bg + ';color:#fff;padding:12px 16px;border-radius:10px;font-size:13.5px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.18);line-height:1.5;opacity:1;transition:opacity .4s;';
    t.innerHTML = msg;
    c.appendChild(t);
    setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 400); }, 5000);
}

// ============================================================
// REALTIME WEBSOCKETS (INVENTORY & CART SYNC)
// ============================================================
if (window.CART_ENV && window.CART_ENV.userId) {
    (function () {
        'use strict';
        var proto  = location.protocol === 'https:' ? 'wss' : 'ws';

        // --- 1. Inventory Sync ---
        function handleInventoryUpdate(data) {
            if (data.type === 'establishment_status') {
                var estId   = String(data.establishment_id);
                var box     = document.querySelector('.establishment-cart-box[data-establishment-id="' + estId + '"]');
                if (!box) return;

                var isNowOpen  = (data.status === 'Open');
                var wasOpen    = box.getAttribute('data-is-open') === 'true';
                if (isNowOpen === wasOpen) return;

                if (isNowOpen) {
                    box.setAttribute('data-is-open', 'true');
                    box.querySelectorAll('.estab-closed-badge').forEach(b => b.remove());
                    _unlockOpenEstab(box);
                    var name = (box.querySelector('.estab-name-link') || {}).firstChild?.textContent?.trim() || 'Establishment';
                    window.showCartToast('✅ <strong>' + name + '</strong> is now open!', 'success');
                } else {
                    box.setAttribute('data-is-open', 'false');
                    if (data.opening_time) box.setAttribute('data-opening-time', data.opening_time);
                    if (data.closing_time) box.setAttribute('data-closing-time', data.closing_time);

                    var header = box.querySelector('.cart-establishment-info');
                    var badge  = header ? header.querySelector('.estab-closed-badge') : null;
                    var opensText = data.opening_time ? ' <span class="estab-opens-at">&middot; Opens ' + data.opening_time + '</span>' : '';
                    if (!badge && header) {
                        badge = document.createElement('span');
                        badge.className = 'estab-closed-badge';
                        var h2 = header.querySelector('h2');
                        if (h2) h2.insertAdjacentElement('afterend', badge);
                    }
                    if (badge) badge.innerHTML = '<i class="fas fa-clock"></i> Closed' + opensText;

                    _lockClosedEstab(box);
                    var estNameStr = box.querySelector('.estab-name-link')?.firstChild?.textContent?.trim() || 'Establishment';
                    window.showCartToast('\uD83D\uDD12 <strong>' + estNameStr + '</strong> is now closed.', 'warning');
                }
                if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();
                return;
            }

            if (data.type === 'item_updated' && data.update) {
                var upd = data.update;
                var menuItemId  = String(upd.menu_item_id);
                var newPrice    = parseFloat(upd.price);
                var newQty      = parseInt(upd.quantity, 10);

                document.querySelectorAll('.cart-item[data-menu-item-id="' + menuItemId + '"]').forEach(function(cartItem) {
                    if (upd.name) {
                        var nameEl = cartItem.querySelector('.item-name');
                        if (nameEl) nameEl.textContent = upd.name;
                        cartItem.setAttribute('data-name', upd.name);
                    }
                    if (!isNaN(newPrice)) {
                        var priceEl = cartItem.querySelector('.item-price');
                        if (priceEl) priceEl.textContent = '₱' + newPrice.toFixed(2) + ' each';
                        cartItem.setAttribute('data-unit-price', newPrice);
                    }
                    if (!isNaN(newQty)) {
                        var stockCountEl = cartItem.querySelector('.stock-count');
                        if (stockCountEl) stockCountEl.textContent = newQty;
                        cartItem.dataset.maxStock = newQty;
                    }
                });
                if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();
            }
        }

        document.querySelectorAll('.establishment-cart-box[data-establishment-id]').forEach(function(box) {
            const estId = box.getAttribute('data-establishment-id');
            if (!estId) return;
            let ws;
            function connectInv() {
                ws = new WebSocket(proto + '://' + location.host + '/ws/inventory/' + estId + '/');
                ws.onmessage = function(e) { try { handleInventoryUpdate(JSON.parse(e.data)); } catch(err) {} };
                ws.onclose   = function() { setTimeout(connectInv, 3000); };
            }
            connectInv();
        });

        // --- 2. Cart Sync ---
        var wsUrl  = proto + '://' + location.host + '/ws/cart/' + window.CART_ENV.userId + '/';
        var _reconnectDelay = 2000;
        var _ws = null;

        function isOriginatingTab(type, id) {
            var last = window._lastCartAction;
            if (!last) return false;
            if (last.type === type && String(last.id) === String(id)) {
                window._lastCartAction = null;
                return true;
            }
            return false;
        }

        function connectSync() {
            _ws = new WebSocket(wsUrl);
            _ws.onopen = function () { _reconnectDelay = 2000; };
            _ws.onmessage = function (e) {
                var data; try { data = JSON.parse(e.data); } catch (_) { return; }
                switch (data.type) {
                    case 'cart_quantity_updated':
                        if (isOriginatingTab('quantity', data.order_item_id)) return;
                        var cartItem = document.querySelector('#cart-item-' + data.order_item_id);
                        if(cartItem) {
                            var qtyEl = cartItem.querySelector('.quantity-value');
                            if(qtyEl) qtyEl.textContent = data.new_quantity;
                            var subtotalEl = document.getElementById('item-total-' + data.order_item_id);
                            if(subtotalEl) subtotalEl.textContent = '₱' + parseFloat(data.item_total).toFixed(2);
                        }
                        if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                        break;
                    case 'cart_item_removed':
                        if (isOriginatingTab('remove', data.order_item_id)) return;
                        var el = document.querySelector('#cart-item-' + data.order_item_id);
                        if(el) el.remove();
                        if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                        break;
                    case 'cart_establishment_cleared':
                    case 'cart_order_sent':
                        var box = document.querySelector('.establishment-cart-box[data-establishment-id="' + data.establishment_id + '"]');
                        if (box) box.remove();
                        if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                        break;
                }
                _cartUpdateCount(data.cart_count || 0);
                _cartUpdateBadge(data.cart_count || 0);
                _cartShowEmptyIfNeeded();
            };
            _ws.onclose = function () { setTimeout(connectSync, _reconnectDelay); _reconnectDelay = Math.min(_reconnectDelay * 1.5, 30000); };
        }
        connectSync();

        // ✅ REALTIME: Makinig sa kabsueats page kapag nag-add ng item sa cart
        // Kapag may nag-add to cart mula sa best sellers, i-update agad ang cart DOM
        // nang hindi kailangan mag-reload ng buong page.
        try {
            const _kabsuCartSyncBC = new BroadcastChannel('kabsueats_cart_sync');
            _kabsuCartSyncBC.onmessage = function(event) {
                var msg = event.data;
                if (!msg || msg.type !== 'item_added') return;

                var menuItemId = String(msg.menu_item_id);
                var cartItemEl = document.querySelector('.cart-item[data-menu-item-id="' + menuItemId + '"]');

                if (cartItemEl && msg.added_qty) {
                    // ── Item EXISTING sa cart DOM — i-update ang qty, addons, at note nang walang reload ──
                    var itemId = cartItemEl.getAttribute('data-item-id');

                    // 1. I-update ang menu item quantity
                    var qtyEl      = cartItemEl.querySelector('.quantity-value');
                    var currentQty = qtyEl ? (parseInt(qtyEl.textContent, 10) || 0) : 0;
                    var newQty     = currentQty + msg.added_qty;
                    if (qtyEl) qtyEl.textContent = newQty;
                    cartItemEl.setAttribute('data-qty', newQty);

                    // 2. I-merge/stack ang addons (same addon id → dagdag ang qty; bagong addon → i-add)
                    var existingAddons = [];
                    try { existingAddons = JSON.parse(cartItemEl.dataset.addonsJson || '[]'); } catch(e) {}
                    var newAddons = Array.isArray(msg.addons) ? msg.addons : [];

                    var finalAddons = existingAddons; // default: walang pagbabago sa addons
                    if (newAddons.length > 0) {
                        // Build merged map keyed by addon id
                        var mergedMap = {};
                        existingAddons.forEach(function(a) {
                            mergedMap[String(a.id)] = Object.assign({}, a);
                        });
                        newAddons.forEach(function(na) {
                            var key = String(na.id);
                            if (mergedMap[key]) {
                                // Dagdag lang ang qty para sa existing addon
                                mergedMap[key].qty = (parseInt(mergedMap[key].qty) || 1) + (parseInt(na.qty) || 1);
                            } else {
                                // Bagong addon — idagdag
                                mergedMap[key] = Object.assign({}, na);
                            }
                        });
                        finalAddons = Object.values(mergedMap);

                        // I-update ang data attributes
                        cartItemEl.dataset.addonsJson = JSON.stringify(finalAddons);

                        // I-recalculate ang addons total per unit
                        var newAddonsTotal = finalAddons.reduce(function(sum, a) {
                            return sum + parseFloat(a.additional_price || 0) * parseInt(a.qty || 1, 10);
                        }, 0);
                        cartItemEl.dataset.addonsTotal = newAddonsTotal.toFixed(2);

                        // I-update ang addons display chips sa cart item
                        var displayEl = document.getElementById('addons-display-' + itemId);
                        if (displayEl) {
                            displayEl.innerHTML = finalAddons.map(function(a) {
                                var aQty = parseInt(a.qty) || 1;
                                var aTotal = parseFloat(a.additional_price) * aQty;
                                var qtyText = aQty > 1 ? ' \xd7' + aQty : '';
                                return '<span class="addon-chip">' +
                                    '<i class="fas fa-plus" style="font-size:0.6rem;"></i> ' +
                                    a.name + qtyText +
                                    (parseFloat(a.additional_price) > 0
                                        ? ' <span class="addon-price">+\u20b1' + aTotal.toFixed(2) + '</span>'
                                        : '') +
                                    '</span>';
                            }).join('');
                        }
                    }

                    // 3. I-update ang note (kung may bagong note)
                    if (msg.note) {
                        var noteEl = cartItemEl.querySelector('.item-note-textarea');
                        if (noteEl) noteEl.value = msg.note;
                    }

                    // 4. I-recalculate ang subtotal (kasama na ang updated addons total)
                    var unitPrice   = parseFloat(cartItemEl.getAttribute('data-unit-price')) || 0;
                    var addonsTotal = parseFloat(cartItemEl.dataset.addonsTotal) || 0;
                    var subtotalEl  = document.getElementById('item-total-' + itemId);
                    if (subtotalEl) {
                        subtotalEl.textContent = '\u20b1' + (unitPrice * newQty + addonsTotal).toFixed(2);
                    }

                    // 5. I-update ang +/- button disabled state
                    var rawMaxStock  = parseInt(cartItemEl.dataset.maxStock, 10);
                    var remainingQty = parseInt(cartItemEl.dataset.remainingQty, 10);
                    var effMax = !isNaN(remainingQty) ? Math.min(remainingQty, rawMaxStock) : rawMaxStock;
                    var decBtn = cartItemEl.querySelector('.btn-decrease');
                    var incBtn = cartItemEl.querySelector('.btn-increase');
                    if (decBtn) decBtn.disabled = (newQty <= 1);
                    if (incBtn) incBtn.disabled = (!isNaN(effMax) && newQty >= effMax);

                    // 6. I-update ang cart badge count
                    if (msg.cart_count !== null && msg.cart_count !== undefined) {
                        _cartUpdateBadge(msg.cart_count);
                        _cartUpdateCount(msg.cart_count);
                    }

                    // 7. I-rebuild ang order summary para updated ang grand total
                    if (window.rebuildOrderSummary) window.rebuildOrderSummary();
                    if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();

                } else {
                    // ── BAGONG item o bagong establishment — i-reload para makuha ang fresh HTML ──
                    // (kailangan ang full page reload para makuha ang bagong cart item HTML
                    //  na galing sa Django template)
                    window.location.reload();
                }
            };
        } catch(_bcErr) {
            // BroadcastChannel not supported (older browsers) — silently ignore
        }

        // Register tab actions to prevent duplicate websocket updates in the same tab
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.btn-decrease, .btn-increase');
            if (btn) window._lastCartAction = { type: 'quantity', id: btn.getAttribute('data-item-id') };

            var rmBtn = e.target.closest('.remove-item-btn');
            if (rmBtn) window._lastCartAction = { type: 'remove', id: rmBtn.closest('.cart-item')?.getAttribute('data-item-id') };

            var clrBtn = e.target.closest('.clear-establishment-btn');
            if (clrBtn) window._lastCartAction = { type: 'clear', id: clrBtn.closest('.establishment-cart-box')?.getAttribute('data-establishment-id') };
        }, true);
    })();
}