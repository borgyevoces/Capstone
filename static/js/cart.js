{% extends "webapplication/kabsueats.html" %}
{% load static %}
{% load custom_filters %}
{% load static custom_filters webapp_filters %}

{# ✅ ADDED: Hide Search Bar Logic #}
{% block search_visibility_control %}
{% with show_search=False %}{% endwith %}
{% endblock search_visibility_control %}

{% block title %}Shopping Cart - KabsuEats{% endblock %}

{% block extra_css %}

<style>
@media (max-width: 768px) {
    .main, .main.main-with-sidebar { padding-bottom: 80px !important; }
}
</style>
<link rel="stylesheet" href="{% static 'css/cart_page.css' %}" />
<style>
/* CART OVERRIDE - Inline styles beat any cached external CSS */
body{background:#ffffff!important}
.cart-establishment-info{background:#ffffff!important;background-image:none!important;padding:18px 24px!important;display:flex!important;align-items:center!important;gap:12px!important;position:relative!important;border-bottom:2px solid #f0f0f0!important}
.cart-establishment-info i.fa-store{color:#B71C1C!important;opacity:1!important;font-size:1.4rem!important}
.cart-establishment-info h2{color:#111!important;font-weight:700!important;margin:0!important;flex:1!important}
.clear-establishment-btn{background:#f0f0f0!important;border:1px solid #ddd!important;color:#555!important}
.clear-establishment-btn:hover{background:#B71C1C!important;border-color:#B71C1C!important}
.establishment-cart-box{background:#fff!important;border-radius:12px!important;overflow:hidden!important}
.establishment-cart-box:hover{box-shadow:0 5px 18px rgba(0,0,0,.13)!important;transform:translateY(-2px)!important}
.cart-item{background:#fff!important;border-bottom:1px solid #f0f0f0!important;display:flex!important;align-items:center!important;gap:20px!important;padding:20px 24px!important}
.cart-item:hover{background:#fafafa!important}
.item-name{color:#111!important;font-weight:700!important}
.item-price{color:#555!important}
.item-stock{color:#16a34a!important}
.item-subtotal{color:#B71C1C!important;font-weight:700!important}
.remove-item-btn{background:transparent!important;border:none!important;color:#999!important;cursor:pointer!important;font-size:.82rem!important;padding:4px 8px!important;border-radius:4px!important;display:flex!important;align-items:center!important;gap:5px!important;transition:all .2s ease!important}.remove-item-btn:hover{color:#B71C1C!important;background:#fff0f0!important}
.quantity-btn{background:#fff!important;border:1.5px solid #ccc!important;color:#111!important;box-shadow:none!important}
.quantity-btn:hover:not(:disabled){background:#111!important;border-color:#111!important;color:#fff!important}
.quantity-value{color:#111!important}
.cart-summary{background:#fff!important;border:1px solid #e5e5e5!important}
.summary-title{color:#111!important}
.summary-establishment-name{color:#111!important;background:#f8f8f8!important;border:1px solid #e0e0e0!important;font-weight:700!important}
.summary-line{color:#555!important}
.summary-line strong,.grand-total-line strong{color:#111!important}
.grand-total-amount{color:#111!important;font-weight:700!important}
#initial-checkout-btn,.btn-checkout-main,.summary-content #initial-checkout-btn{
  width:100%!important;align-items:center!important;justify-content:center!important;gap:10px!important;
  padding:16px 24px!important;margin-top:20px!important;font-size:1rem!important;font-weight:700!important;
  color:#fff!important;background:#B71C1C!important;background-image:none!important;
  border:none!important;border-radius:10px!important;cursor:pointer!important;
  box-shadow:0 4px 14px rgba(183,28,28,.3)!important;text-transform:uppercase!important;letter-spacing:.5px!important;
  box-sizing:border-box!important;outline:none!important;-webkit-appearance:none!important;line-height:normal!important}
#initial-checkout-btn:hover,.btn-checkout-main:hover{background:#8B0000!important;transform:translateY(-2px)!important;box-shadow:0 6px 20px rgba(183,28,28,.4)!important}
#initial-checkout-btn:disabled,.btn-checkout-main:disabled{background:#ccc!important;cursor:not-allowed!important;transform:none!important;box-shadow:none!important}
.payment-method-section{border-top:2px solid #f0f0f0!important;padding-top:20px!important;margin-top:20px!important}
.payment-method-title{color:#111!important;font-size:.85rem!important;font-weight:700!important;text-transform:uppercase!important;text-align:center!important;margin-bottom:14px!important;letter-spacing:.6px!important}
.btn-paymongo{border:2px solid #B71C1C!important;background:#fff5f5!important;width:100%!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;gap:12px!important;padding:14px 16px!important;border-radius:10px!important;cursor:pointer!important;margin-bottom:10px!important;transition:all .25s ease!important}
.btn-paymongo i{color:#B71C1C!important;font-size:1.5rem!important}
.btn-paymongo:hover:not(:disabled){background:#B71C1C!important;transform:translateY(-2px)!important;box-shadow:0 4px 14px rgba(183,28,28,.3)!important}
.btn-paymongo:hover:not(:disabled) i,.btn-paymongo:hover:not(:disabled) .payment-method-name,.btn-paymongo:hover:not(:disabled) .payment-method-desc{color:#fff!important}
.btn-cash{border:2px solid #16a34a!important;background:#f0fdf4!important;width:100%!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;gap:12px!important;padding:14px 16px!important;border-radius:10px!important;cursor:pointer!important;margin-bottom:0!important;transition:all .25s ease!important}
.btn-cash i{color:#16a34a!important;font-size:1.5rem!important}
.btn-cash:hover:not(:disabled){background:#16a34a!important;transform:translateY(-2px)!important;box-shadow:0 4px 14px rgba(22,163,74,.3)!important}
.btn-cash:hover:not(:disabled) i,.btn-cash:hover:not(:disabled) .payment-method-name,.btn-cash:hover:not(:disabled) .payment-method-desc{color:#fff!important}
.payment-method-info{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:2px!important;flex:1!important;min-width:0!important}
.payment-method-name{font-weight:700!important;font-size:.95rem!important;color:#111!important;white-space:nowrap!important}
.payment-method-desc{font-size:.78rem!important;color:#666!important;white-space:nowrap!important}
.security-badge{background:#f8f8f8!important;color:#888!important;margin-top:16px!important;padding:10px!important;border-radius:8px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;font-size:.8rem!important}
.security-badge i{color:#16a34a!important}
.continue-shopping{color:#333!important;background:#fff!important;border:1.5px solid #e0e0e0!important;display:block!important;text-align:center!important;padding:14px!important;font-weight:600!important;text-decoration:none!important;border-radius:8px!important;transition:all .2s ease!important}
.continue-shopping:hover{color:#B71C1C!important;background:#fff5f5!important;border-color:#B71C1C!important}
.btn-back-to-home{background:#B71C1C!important;color:#fff!important}
.btn-back-to-home:hover{background:#8B0000!important}
@media(max-width:968px){.cart-main-wrapper{grid-template-columns:1fr!important}.cart-summary-sticky{position:static!important}}
@media(max-width:768px){
  .cart-item{display:grid!important;grid-template-columns:80px 1fr!important;grid-template-rows:auto auto!important;gap:12px!important;padding:16px!important}
  .item-image,.item-image-placeholder{width:80px!important;height:80px!important;grid-row:1!important;grid-column:1!important}
  .item-details{grid-row:1!important;grid-column:2!important}
  .item-quantity-controls{grid-row:2!important;grid-column:1/2!important;justify-self:start!important}
  .item-subtotal-section{grid-row:2!important;grid-column:2!important;justify-self:end!important}
}

/* ── CHECKBOXES ── */
.item-checkbox-wrap {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding-right: 4px;
}
.item-checkbox, .estab-select-all {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #B71C1C;
    flex-shrink: 0;
}
.estab-select-all-wrap {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
}
.estab-select-all {
    accent-color: #B71C1C;
    width: 20px;
    height: 20px;
    cursor: pointer;
}
.cart-item.item-unchecked {
    opacity: 0.45;
}

/* ── Establishment box dimmed when unchecked ── */
.establishment-cart-box.estab-unchecked .cart-establishment-info {
    opacity: 0.55;
}
.establishment-cart-box.estab-unchecked .cart-items-list {
    opacity: 0.45;
    pointer-events: none;
}

/* ── Establishment name link ── */
.estab-name-link {
    color: #111;
    text-decoration: none;
    transition: color 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.estab-name-link:hover {
    color: #B71C1C;
}
.estab-name-link .ext-icon {
    font-size: 0.6rem;
    color: #B71C1C;
    opacity: 0.7;
    vertical-align: middle;
}

/* KILL ALL BORDERS ON CART BOX - HIGHEST PRIORITY */
html body #cart-page-container .establishment-cart-box,
html body #cart-page-container .establishment-cart-box:hover,
html body #cart-page-container .establishment-cart-box.active-cart,
html body .establishment-cart-box,
html body .establishment-cart-box:hover,
html body .establishment-cart-box.active-cart {
    border: none !important;
    border-color: transparent !important;
    outline: none !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important;
}

/* ── Multi-establishment Order Summary ── */
.summary-empty-msg {
    text-align: center;
    color: #9CA3AF;
    font-size: 0.88rem;
    padding: 20px 0;
}
.summary-estab-block {
    margin-bottom: 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f0f0f0;
}
.summary-estab-block:last-child {
    margin-bottom: 0;
    border-bottom: none;
}
.summary-estab-label {
    font-size: 0.8rem;
    font-weight: 800;
    color: #111;
    background: #f8f8f8;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 7px 12px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.summary-estab-label i { color: #B71C1C; font-size: 0.85rem; }
.summary-item-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.82rem;
    color: #555;
    padding: 3px 4px;
}
.summary-item-line .item-label { flex: 1; }
.summary-item-line .item-amt   { font-weight: 600; color: #111; white-space: nowrap; }
.summary-estab-subtotal {
    display: flex;
    justify-content: space-between;
    font-size: 0.83rem;
    color: #777;
    padding: 6px 4px 0;
    border-top: 1px dashed #eee;
    margin-top: 4px;
}
.summary-grand-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.05rem;
    font-weight: 800;
    color: #111;
    padding: 14px 0 0;
    border-top: 2px solid #f0f0f0;
    margin-top: 10px;
}
.summary-grand-total-row .total-amt { color: #111; }

/* ============================================
   CONFIRMATION MODAL
   ============================================ */
.cart-confirm-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 99999;
    align-items: center;
    justify-content: center;
    padding: 16px;
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
}
.cart-confirm-overlay.open {
    display: flex;
    animation: ccFadeIn .18s ease;
}
@keyframes ccFadeIn {
    from { opacity:0; }
    to   { opacity:1; }
}
.cart-confirm-box {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.18);
    overflow: hidden;
    animation: ccSlideUp .22s cubic-bezier(.34,1.56,.64,1);
}
@keyframes ccSlideUp {
    from { transform: translateY(24px) scale(.97); opacity:0; }
    to   { transform: translateY(0) scale(1);      opacity:1; }
}
.cart-confirm-icon-band {
    padding: 32px 24px 14px;
    display: flex;
    justify-content: center;
}
.cart-confirm-icon {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
}
.cart-confirm-icon.icon-remove { background:#fff0f0; color:#B71C1C; }
.cart-confirm-icon.icon-clear  { background:#fff3e0; color:#e65100; }
.cart-confirm-text {
    padding: 0 28px 26px;
    text-align: center;
}
.cart-confirm-text h3 {
    font-size: 17px;
    font-weight: 700;
    color: #111;
    margin: 0 0 8px;
}
.cart-confirm-text p {
    font-size: 13.5px;
    color: #666;
    margin: 0;
    line-height: 1.55;
}
.cart-confirm-item-name {
    font-weight: 700;
    color: #111;
}
.cart-confirm-actions {
    display: flex;
    border-top: 1px solid #f0f0f0;
}
.cart-confirm-actions button {
    flex: 1;
    padding: 16px 12px;
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
    font-family: inherit;
}
.cc-cancel-btn {
    color: #555 !important;
    border-right: 1px solid #f0f0f0 !important;
}
.cc-cancel-btn:hover { background: #f8f8f8 !important; }
.cc-confirm-btn.btn-danger  { color: #B71C1C !important; }
.cc-confirm-btn.btn-danger:hover  { background: #fff0f0 !important; }
.cc-confirm-btn.btn-warning { color: #e65100 !important; }
.cc-confirm-btn.btn-warning:hover { background: #fff3e0 !important; }
</style>
{% endblock %}

{% block content %}

<div id="cart-page-container">

    {% if carts_data %}
        <!-- Cart Header -->
        <div class="cart-header">
            <h1>Shopping Cart</h1>
            <span class="cart-item-count">{{ total_cart_count }} item{{ total_cart_count|pluralize }}</span>
        </div>

        <!-- Main Cart Layout -->
        <div class="cart-main-wrapper">

            <!-- Left Column: All Establishment Carts -->
            <div class="all-carts-container">

                {% for cart in carts_data %}
                <div class="establishment-cart-box"
                     data-establishment-id="{{ cart.establishment.id }}"
                     data-order-id="{{ cart.order.id }}">

                    <!-- Establishment Header -->
                    <div class="cart-establishment-info">
                        <label class="estab-select-all-wrap" onclick="event.stopPropagation()">
                            <input type="checkbox"
                                   class="estab-select-all"
                                   data-establishment-id="{{ cart.establishment.id }}"
                                   checked
                                   onchange="toggleEstablishmentItems(this)">
                        </label>
                        <i class="fas fa-store"></i>
                        <h2>
                            <a href="{% url 'food_establishment_details' cart.establishment.id %}"
                               class="estab-name-link"
                               target="_self"
                               onclick="event.stopPropagation()">
                                {{ cart.establishment.name }}
                            </a>
                        </h2>
                        <button type="button"
                                class="clear-establishment-btn"
                                onclick="clearEstablishmentCart({{ cart.establishment.id }})"
                                title="Clear this cart">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>

                    <!-- Cart Items List -->
                    <div class="cart-items-list">
                        {% for item in cart.items %}
                            <div class="cart-item"
                                 id="cart-item-{{ item.id }}"
                                 data-order-id="{{ cart.order.id }}"
                                 data-item-id="{{ item.id }}"
                                 data-menu-item-id="{{ item.menu_item.id }}"
                                 data-max-stock="{{ item.menu_item.quantity }}"
                                 data-remaining-qty="{{ item.remaining_allowed }}"
                                 data-unit-price="{{ item.menu_item.price }}"
                                 data-qty="{{ item.display_qty }}"
                                 data-name="{{ item.menu_item.name|escapejs }}">

                                <!-- Item Checkbox -->
                                <div class="item-checkbox-wrap" onclick="event.stopPropagation()">
                                    <input type="checkbox"
                                           class="item-checkbox"
                                           data-item-id="{{ item.id }}"
                                           data-order-id="{{ cart.order.id }}"
                                           data-establishment-id="{{ cart.establishment.id }}"
                                           checked
                                           onchange="onItemCheckboxChange(this)">
                                </div>

                                <!-- Item Image -->
                                <img src="{% if item.menu_item.image %}{{ item.menu_item.image.url }}{% else %}data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='150' y='165' text-anchor='middle' fill='%23d1d5db' font-size='80' font-family='sans-serif'%3E%F0%9F%8D%BD%3C/text%3E%3C/svg%3E{% endif %}" alt="{{ item.menu_item.name }}" class="item-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='150' y='165' text-anchor='middle' fill='%23d1d5db' font-size='80' font-family='sans-serif'%3E%F0%9F%8D%BD%3C/text%3E%3C/svg%3E'">
                                {% endif %}

                                <!-- Item Details -->
                                <div class="item-details">
                                    <h3 class="item-name">{{ item.menu_item.name }}</h3>
                                    <p class="item-price" data-unit-price="{{ item.menu_item.price }}">₱{{ item.menu_item.price|floatformat:2 }} each</p>
                                    <p class="item-stock">
                                        <i class="fas fa-box"></i>
                                        <span class="stock-count">{{ item.menu_item.quantity }}</span> available
                                    </p>
                                    {% if item.has_request_limit %}
                                    <p class="item-request-limit" style="font-size:12px;color:#d97706;margin-top:3px;">
                                        <i class="fas fa-exclamation-circle"></i>
                                        {{ item.existing_req_qty }} already requested &mdash; max {{ item.remaining_allowed }} more
                                    </p>
                                    {% endif %}
                                </div>

                                <!-- Quantity Controls -->
                                <div class="item-quantity-controls">
                                    <button type="button"
                                            class="quantity-btn btn-decrease"
                                            data-item-id="{{ item.id }}"
                                            {% if item.display_qty <= 1 %}disabled{% endif %}>
                                        <i class="fas fa-minus"></i>
                                    </button>

                                    <span class="quantity-value" data-item-id="{{ item.id }}">{{ item.display_qty }}</span>

                                    <button type="button"
                                            class="quantity-btn btn-increase"
                                            data-item-id="{{ item.id }}"
                                            {% if item.display_qty >= item.remaining_allowed %}disabled{% endif %}>
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>

                                <!-- Item Subtotal & Remove -->
                                <div class="item-subtotal-section">
                                    <span class="item-subtotal" id="item-total-{{ item.id }}">
                                        ₱{{ item.total_price|floatformat:2 }}
                                    </span>
                                    <button type="button"
                                            class="remove-item-btn"
                                            onclick="removeItemFromCart({{ item.id }})">
                                        <i class="fas fa-trash-alt"></i>
                                        Remove
                                    </button>
                                </div>

                            </div>
                        {% endfor %}
                    </div>

                </div>
                {% endfor %}

            </div>

            <!-- Right Column: Order Summary (Sticky) -->
            <div class="cart-summary-sticky">
                <div class="cart-summary" id="active-order-summary">
                    <h2 class="summary-title">Order Summary</h2>

                    <!-- Dynamic summary rendered by JS -->
                    <div id="summary-body">
                        <p class="summary-empty-msg">Check an establishment to see order details.</p>
                    </div>

                    <!-- Grand total + button (hidden when nothing checked) -->
                    <div id="summary-footer" style="display:none;">
                        <div class="summary-grand-total-row">
                            <strong>Total</strong>
                            <span class="total-amt" id="summary-grand-total">₱0.00</span>
                        </div>

                        <button type="button"
                                class="btn-checkout-main"
                                id="initial-checkout-btn"
                                onclick="sendOrderRequest()">
                            <i class="fas fa-paper-plane"></i>
                            Send Order Request
                        </button>

                        <div class="security-badge">
                            <i class="fas fa-info-circle"></i>
                            <span>Owner will confirm your request</span>
                        </div>
                    </div>

                    <!-- Shown only when nothing is checked -->
                    <div id="summary-no-selection" style="display:none; text-align:center; padding: 12px 0;">
                        <p style="color:#9CA3AF; font-size:0.85rem;">
                            <i class="fas fa-mouse-pointer" style="margin-right:5px;"></i>
                            Check an establishment above to include it in your order.
                        </p>
                    </div>
                </div>

                <a href="{% url 'kabsueats_home' %}" class="continue-shopping">
                    <i class="fas fa-arrow-left"></i> Back To Dashboard
                </a>
            </div>

        </div>

    {% else %}
        <!-- Empty Cart State -->
        <div class="empty-cart-message">
            <div class="empty-cart-icon">
                <i class="fas fa-shopping-cart"></i>
            </div>
            <h2>Your cart is empty</h2>
            <p>Add items to your cart to get started!</p>
            <a href="{% url 'kabsueats_home' %}" class="btn-back-to-home">
                <i class="fas fa-store"></i> Browse Establishments
            </a>
        </div>
    {% endif %}

</div>

<!-- ============================================================
     REMOVE ITEM CONFIRMATION MODAL
     ============================================================ -->
<div class="cart-confirm-overlay" id="ccRemoveModal">
    <div class="cart-confirm-box">
        <div class="cart-confirm-icon-band">
            <div class="cart-confirm-icon icon-remove">
                <i class="fas fa-trash-alt"></i>
            </div>
        </div>
        <div class="cart-confirm-text">
            <h3>Remove Item</h3>
            <p>Remove <span class="cart-confirm-item-name" id="ccRemoveItemName">this item</span> from your cart?</p>
        </div>
        <div class="cart-confirm-actions">
            <button class="cc-cancel-btn"  id="ccRemoveCancelBtn">Keep It</button>
            <button class="cc-confirm-btn btn-danger" id="ccRemoveConfirmBtn">
                <i class="fas fa-trash-alt" style="margin-right:5px;font-size:12px;"></i>Yes, Remove
            </button>
        </div>
    </div>
</div>

<!-- ============================================================
     CLEAR ESTABLISHMENT CART CONFIRMATION MODAL
     ============================================================ -->
<div class="cart-confirm-overlay" id="ccClearModal">
    <div class="cart-confirm-box">
        <div class="cart-confirm-icon-band">
            <div class="cart-confirm-icon icon-clear">
                <i class="fas fa-trash"></i>
            </div>
        </div>
        <div class="cart-confirm-text">
            <h3>Clear Cart</h3>
            <p>Remove all items from <span class="cart-confirm-item-name" id="ccClearEstabName">this establishment</span>?<br>This cannot be undone.</p>
        </div>
        <div class="cart-confirm-actions">
            <button class="cc-cancel-btn"  id="ccClearCancelBtn">Cancel</button>
            <button class="cc-confirm-btn btn-warning" id="ccClearConfirmBtn">
                <i class="fas fa-trash" style="margin-right:5px;font-size:12px;"></i>Clear All
            </button>
        </div>
    </div>
</div>

<!-- ============================================================
     ORDER REQUEST SUCCESS MODAL
     ============================================================ -->
<div class="cart-confirm-overlay" id="orderRequestModal">
    <div class="cart-confirm-box" style="max-width:420px;">
        <div class="cart-confirm-icon-band" style="padding:36px 24px 16px;">
            <div class="cart-confirm-icon" style="background:#f0fdf4;color:#16a34a;width:80px;height:80px;font-size:36px;">
                <i class="fas fa-check-circle"></i>
            </div>
        </div>
        <div class="cart-confirm-text" style="padding:0 28px 10px;">
            <h3 style="font-size:19px;margin-bottom:10px;">Order Request Sent!</h3>
            <p style="font-size:14px;line-height:1.6;color:#555;">
                Your order request has been sent to the establishment.<br>
                Please wait while the owner reviews and accepts your order.<br><br>
                <span style="display:inline-flex;align-items:center;gap:6px;background:#fef9c3;color:#713f12;padding:8px 14px;border-radius:8px;font-weight:600;font-size:13px;">
                    <i class="fas fa-clock"></i> Waiting for owner to accept…
                </span>
            </p>
            <p style="font-size:12.5px;color:#999;margin-top:14px;">
                Once accepted, you will see a <strong>Pay Now</strong> button in your order history.
            </p>
        </div>
        <div class="cart-confirm-actions" style="border-top:1px solid #f0f0f0;padding:4px 0;display:flex;flex-direction:column;gap:0;">
            <a href="{% url 'order_history' %}"
               style="flex:1;padding:16px 12px;border:none;background:transparent;font-size:14px;font-weight:700;cursor:pointer;color:#B71C1C;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;transition:background .15s;">
                <i class="fas fa-list-alt"></i> Go to My Orders
            </a>
            <a href="{% url 'kabsueats_home' %}"
               style="flex:1;padding:14px 12px;border:none;border-top:1px solid #f0f0f0;background:transparent;font-size:14px;font-weight:600;cursor:pointer;color:#666;font-family:inherit;transition:background .15s;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;">
                <i class="fas fa-utensils"></i> Browse More Food
            </a>
        </div>
    </div>
</div>

{% endblock %}

{% block extra_js %}
<script>
    // Auto-scroll to payment section when redirected from "Buy Now" button
    document.addEventListener('DOMContentLoaded', function () {
        const params = new URLSearchParams(window.location.search);
        if (params.get('pay') === '1') {
            setTimeout(function () {
                const firstEstablishment = document.querySelector('.establishment-cart-box');
                if (firstEstablishment) {
                    firstEstablishment.click();
                }
            }, 300);
        }

        // Initial summary render on page load
        window.rebuildOrderSummary();
        // Initial stock check — flag any OOS items already in cart
        if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();
    });

    // ============================================================
    // CUSTOM CONFIRM MODAL — replaces browser confirm()
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
                const itemName = window._pendingRemoveItemName || 'this item';
                nameEl.textContent = itemName;
                window._pendingRemoveItemName = null;
            }
        } else {
            const estabEl = document.getElementById('ccClearEstabName');
            if (estabEl) {
                const estabName = window._pendingClearEstabName || 'this establishment';
                estabEl.textContent = estabName;
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

    // ── Intercept remove/clear to capture name before modal opens ──
    document.addEventListener('click', function(e) {
        const removeBtn = e.target.closest('.remove-item-btn');
        if (removeBtn) {
            const cartItem = removeBtn.closest('.cart-item');
            if (cartItem) {
                const nameEl = cartItem.querySelector('.item-name');
                window._pendingRemoveItemName = nameEl ? nameEl.textContent.trim() : 'this item';
            }
        }
        const clearBtn = e.target.closest('.clear-establishment-btn');
        if (clearBtn) {
            const estabBox = clearBtn.closest('.establishment-cart-box');
            if (estabBox) {
                const nameEl = estabBox.querySelector('.cart-establishment-info h2');
                window._pendingClearEstabName = nameEl ? nameEl.textContent.trim() : 'this establishment';
            }
        }
    }, true);

    // ============================================================
    // ORDER SUMMARY — rebuilt dynamically from checked items
    // Exposed on window so ALL script blocks can call it safely
    // ============================================================
    window.rebuildOrderSummary = function() {
        const summaryBody   = document.getElementById('summary-body');
        const summaryFooter = document.getElementById('summary-footer');
        const summaryNoSel  = document.getElementById('summary-no-selection');
        const grandTotalEl  = document.getElementById('summary-grand-total');

        const estabBoxes = document.querySelectorAll('.establishment-cart-box');
        let html       = '';
        let grandTotal = 0;
        let anyChecked = false;

        estabBoxes.forEach(function(box) {
            const estabNameEl = box.querySelector('.cart-establishment-info h2');
            if (!estabNameEl) return;

            // SOLE source of truth: count checked item checkboxes directly.
            // Never gate on estabChk.indeterminate — it is write-only in browsers;
            // reading it back after a programmatic set is unreliable.
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
                const subtotal = qty * price;
                estabSubtotal += subtotal;

                itemsHtml += `
                    <div class="summary-item-line">
                        <span class="item-label">${name} ×${qty}</span>
                        <span class="item-amt">₱${subtotal.toFixed(2)}</span>
                    </div>`;
            });

            grandTotal += estabSubtotal;

            const estabNameText = estabNameEl.querySelector('.estab-name-link')?.firstChild?.textContent?.trim()
                                || estabNameEl.textContent.trim();

            html += `
                <div class="summary-estab-block">
                    <div class="summary-estab-label">
                        <i class="fas fa-store"></i>
                        ${estabNameText}
                    </div>
                    ${itemsHtml}
                    <div class="summary-estab-subtotal">
                        <span>Subtotal</span>
                        <strong>₱${estabSubtotal.toFixed(2)}</strong>
                    </div>
                </div>`;
        });

        if (anyChecked) {
            summaryBody.innerHTML       = html;
            summaryFooter.style.display = 'block';
            summaryNoSel.style.display  = 'none';
            grandTotalEl.textContent    = '₱' + grandTotal.toFixed(2);
        } else {
            summaryBody.innerHTML       = '<p class="summary-empty-msg">Check an establishment to see order details.</p>';
            summaryFooter.style.display = 'none';
            summaryNoSel.style.display  = 'none';
        }
    };

    // ============================================================
    // CHECKBOX HANDLERS
    // ============================================================

    // Establishment header checkbox — check/uncheck ALL items inside
    window.toggleEstablishmentItems = function(estabChk) {
        const estabId = estabChk.getAttribute('data-establishment-id');
        const box     = document.querySelector(`.establishment-cart-box[data-establishment-id="${estabId}"]`);
        if (!box) return;

        const checked = estabChk.checked;

        // Sync all item checkboxes to match the establishment checkbox
        box.querySelectorAll('.item-checkbox').forEach(function(chk) {
            chk.checked = checked;
            const cartItem = chk.closest('.cart-item');
            if (cartItem) cartItem.classList.toggle('item-unchecked', !checked);
        });

        box.classList.toggle('estab-unchecked', !checked);

        // Rebuild immediately — realtime update
        window.rebuildOrderSummary();
    };

    // Individual item checkbox — update parent estab checkbox state then rebuild
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
                    // Partially checked — indeterminate visual only (do NOT read back)
                    estabChk.checked       = false;
                    estabChk.indeterminate = true;
                    box.classList.remove('estab-unchecked');
                }
            }
        }

        window.rebuildOrderSummary();
        // Re-evaluate checkout button after checkbox change
        if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();
    };

    // Rebuild summary when cart.js fires quantity update event
    document.addEventListener('cart:quantityUpdated', function() {
        window.rebuildOrderSummary();
        if (window._updateCheckoutButtonStockState) window._updateCheckoutButtonStockState();
    });

    // ============================================================
    // SEND ORDER REQUEST — only for CHECKED establishments/items
    // Unchecked establishments and items stay in cart untouched
    // ============================================================
    window.sendOrderRequest = function() {
        const btn = document.getElementById('initial-checkout-btn');

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

            const itemIds = [];
            checkedItemChks.forEach(function(chk) {
                const id = chk.getAttribute('data-item-id');
                if (id) itemIds.push(id);
            });

            if (orderId && itemIds.length > 0) {
                ordersToSend.push({ orderId, estabId, estabName, itemIds, box });
            }
        });

        if (ordersToSend.length === 0) {
            alert('Please check at least one establishment to place an order.');
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }

        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value
                       || document.cookie.match(/csrftoken=([^;]+)/)?.[1]
                       || '';

        const URL_SEND = "{% url 'create_cash_order' %}";

        let idx = 0;
        const successBoxes = [];

        function sendNext() {
            if (idx >= ordersToSend.length) {
                // Animate out sent establishment boxes
                successBoxes.forEach(function(box) {
                    box.style.transition = 'opacity 0.35s, transform 0.35s';
                    box.style.opacity    = '0';
                    box.style.transform  = 'translateX(30px)';
                    setTimeout(function() { box.remove(); }, 380);
                });

                setTimeout(function() {
                    window.rebuildOrderSummary();
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
            itemIds.forEach(function(id) {
                fd.append('selected_item_ids[]', id);
            });
            // No source param → defaults to 'cart' → status = 'request'

            fetch(URL_SEND, {
                method: 'POST',
                body: fd,
                headers: { 'X-CSRFToken': csrfToken },
                credentials: 'same-origin'
            })
            .then(function(r) {
                if (!r.ok) {
                    return r.text().then(function(text) {
                        let msg = 'Server error ' + r.status;
                        try { const j = JSON.parse(text); msg = j.message || msg; } catch(e) {}
                        throw new Error(msg);
                    });
                }
                return r.json();
            })
            .then(function(data) {
                if (data.success) {
                    successBoxes.push(box);
                    sendNext();
                } else {
                    throw new Error(data.message || 'Failed to send order for ' + estabName);
                }
            })
            .catch(function(err) {
                console.error('Order request error:', err);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Order Request';
                }
                alert('Error sending order for ' + estabName + ': ' + err.message);
            });
        }

        sendNext();
    };

    // Close the order success modal
    // Close the order success modal — redirect to KabsuEats home to browse more food
    window.closeOrderRequestModal = function() {
        const modal = document.getElementById('orderRequestModal');
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
        window.location.href = "{% url 'kabsueats_home' %}";
    };

</script>
<script src="{% static 'js/cart.js' %}"></script>

<script>
    // ── Re-hook cart.js quantity updates to refresh our summary ──
    (function() {
        const observer = new MutationObserver(function() {
            if (window.rebuildOrderSummary) window.rebuildOrderSummary();
        });
        document.querySelectorAll('.quantity-value').forEach(function(el) {
            observer.observe(el, { childList: true, characterData: true, subtree: true });
        });

        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.btn-decrease, .btn-increase');
            if (!btn) return;
            setTimeout(function() {
                if (window.rebuildOrderSummary) window.rebuildOrderSummary();
            }, 500);
        });
    })();
</script>
{% endblock %}