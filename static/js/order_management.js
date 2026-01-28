// ==========================================
// ORDER MANAGEMENT DASHBOARD - REAL-TIME UPDATES
// Save as: static/js/order_management_realtime.js
// ==========================================

// Global variables
let orderSocket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let currentFilters = {
    status: 'all',
    payment: 'all',
    date: 'today',
    search: ''
};

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeOrderManagement();
});

function initializeOrderManagement() {
    console.log('🚀 Initializing Order Management Dashboard...');

    // Load initial data
    loadOrderStats();
    loadOrders();

    // Set up event listeners
    setupEventListeners();

    // Connect WebSocket for real-time updates
    connectWebSocket();

    // Set up auto-refresh (every 30 seconds as backup)
    setInterval(loadOrderStats, 30000);
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentFilters.search = e.target.value;
                loadOrders();
            }, 500);
        });
    }

    // Filter selects
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function(e) {
            currentFilters.status = e.target.value;
            loadOrders();
        });
    }

    const paymentFilter = document.getElementById('payment-filter');
    if (paymentFilter) {
        paymentFilter.addEventListener('change', function(e) {
            currentFilters.payment = e.target.value;
            loadOrders();
        });
    }

    const dateFilter = document.getElementById('date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function(e) {
            currentFilters.date = e.target.value;
            loadOrders();
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadOrders();
            loadOrderStats();
            showNotification('Data refreshed', 'success');
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportOrders);
    }
}

// ==========================================
// WEBSOCKET CONNECTION
// ==========================================

function connectWebSocket() {
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const establishmentId = document.body.dataset.establishmentId || window.establishmentId;

    if (!establishmentId) {
        console.error('❌ No establishment ID found');
        return;
    }

    const wsPath = `${wsScheme}://${window.location.host}/ws/orders/${establishmentId}/`;

    console.log('🔌 Connecting to WebSocket:', wsPath);

    orderSocket = new WebSocket(wsPath);

    orderSocket.onopen = function(e) {
        console.log('✅ WebSocket connected');
        reconnectAttempts = 0;
        updateConnectionStatus(true);

        // Send ping every 30 seconds to keep connection alive
        setInterval(() => {
            if (orderSocket && orderSocket.readyState === WebSocket.OPEN) {
                orderSocket.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                }));
            }
        }, 30000);
    };

    orderSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        handleWebSocketMessage(data);
    };

    orderSocket.onclose = function(e) {
        console.log('❌ WebSocket closed');
        updateConnectionStatus(false);

        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}`);
            setTimeout(connectWebSocket, 3000);
        } else {
            showNotification('Lost connection to server. Please refresh the page.', 'error');
        }
    };

    orderSocket.onerror = function(e) {
        console.error('❌ WebSocket error:', e);
        updateConnectionStatus(false);
    };
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('connectionDot');
    const status = document.getElementById('connectionStatus');

    if (dot && status) {
        if (connected) {
            dot.classList.remove('disconnected');
            status.textContent = 'Connected';
        } else {
            dot.classList.add('disconnected');
            status.textContent = 'Disconnected';
        }
    }
}

// ==========================================
// WEBSOCKET MESSAGE HANDLER
// ==========================================

function handleWebSocketMessage(data) {
    console.log('📨 WebSocket message:', data);

    switch(data.type) {
        case 'connection_established':
            console.log('✅ Connection confirmed');
            break;

        case 'new_order':
            handleNewOrder(data.order);
            break;

        case 'order_status_changed':
            handleOrderStatusChange(data);
            break;

        case 'order_payment_updated':
            handleOrderPaymentUpdate(data);
            break;

        case 'pong':
            console.log('🏓 Pong received');
            break;

        case 'stats_update':
            updateStatsDisplay(data.stats);
            break;
    }
}

function handleNewOrder(order) {
    console.log('🆕 New order received:', order);

    // Play notification sound
    playNotificationSound();

    // Show notification
    showNotification(`New order #${order.id} from ${order.customer_name}!`, 'success');

    // Show browser notification
    if (Notification.permission === "granted") {
        new Notification("New Order Received! 🎉", {
            body: `Order #${order.id} - ₱${order.total.toFixed(2)}`,
            icon: '/static/images/favicon.png',
            badge: '/static/images/favicon.png'
        });
    }

    // Refresh orders and stats
    loadOrders();
    loadOrderStats();
}

function handleOrderStatusChange(data) {
    console.log('📝 Order status changed:', data);

    // Update the order card in the UI
    const orderCard = document.querySelector(`[data-order-id="${data.order_id}"]`);
    if (orderCard) {
        const statusBadge = orderCard.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.textContent = data.fulfillment_status;
            statusBadge.className = `status-badge status-${data.fulfillment_status}`;
        }

        const paymentBadge = orderCard.querySelector('.payment-badge');
        if (paymentBadge) {
            paymentBadge.textContent = data.payment_status;
            paymentBadge.className = `payment-badge payment-${data.payment_status}`;
        }
    }

    // Refresh stats
    loadOrderStats();
}

function handleOrderPaymentUpdate(data) {
    console.log('💰 Payment updated:', data);

    const orderCard = document.querySelector(`[data-order-id="${data.order_id}"]`);
    if (orderCard) {
        const paymentBadge = orderCard.querySelector('.payment-badge');
        if (paymentBadge) {
            paymentBadge.textContent = data.payment_status;
            paymentBadge.className = `payment-badge payment-${data.payment_status}`;
        }
    }

    loadOrderStats();
}

// ==========================================
// DATA LOADING FUNCTIONS
// ==========================================

function loadOrderStats() {
    fetch('/api/order-stats/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateStatsDisplay(data.stats);
            }
        })
        .catch(error => {
            console.error('Error loading stats:', error);
        });
}

function updateStatsDisplay(stats) {
    // Update stat cards
    const statElements = {
        'stat-total-orders': stats.total_orders || 0,
        'stat-pending': stats.pending || 0,
        'stat-completed': stats.completed || 0,
        'stat-unpaid': stats.unpaid || 0
    };

    for (const [id, value] of Object.entries(statElements)) {
        const element = document.getElementById(id);
        if (element) {
            animateValue(element, parseInt(element.textContent) || 0, value, 500);
        }
    }

    // Update navigation badge
    const badge = document.getElementById('pending-orders-badge');
    if (badge) {
        if (stats.pending > 0) {
            badge.textContent = stats.pending;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function loadOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;

    // Show loading spinner
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    // Build query string
    const params = new URLSearchParams(currentFilters);

    fetch(`/api/order-records/?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrders(data.orders);
            } else {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load orders: ${data.error}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading orders:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load orders. Please try again.</p>
                </div>
            `;
        });
}

function displayOrders(orders) {
    const container = document.getElementById('orders-container');

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No orders found</p>
                <span>Orders will appear here when customers place them</span>
            </div>
        `;
        return;
    }

    let html = '<div class="orders-grid">';

    orders.forEach(order => {
        html += createOrderCard(order);
    });

    html += '</div>';
    container.innerHTML = html;
}

function createOrderCard(order) {
    const statusClass = order.fulfillment_status;
    const paymentClass = order.payment_status;

    return `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-card-header">
                <div class="order-number">${order.order_number}</div>
                <div class="order-badges">
                    <span class="status-badge status-${statusClass}">${order.fulfillment_status}</span>
                    <span class="payment-badge payment-${paymentClass}">${order.payment_status}</span>
                </div>
            </div>

            <div class="customer-info">
                <div class="customer-avatar">${String.fromCharCode(order.customer.avatar)}</div>
                <div class="customer-details">
                    <div class="customer-name">${order.customer.name}</div>
                    <div class="customer-email">${order.customer.email}</div>
                    <div class="customer-phone">${order.customer.phone}</div>
                </div>
            </div>

            <div class="order-items">
                <div class="items-header">
                    <i class="fas fa-utensils"></i>
                    <span>Order Items</span>
                </div>
                ${order.items.map(item => `
                    <div class="order-item-row">
                        <span class="item-name-qty">${item.quantity}x ${item.name}</span>
                        <span class="item-price">₱${item.total.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>

            <div class="order-summary">
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>₱${order.subtotal.toFixed(2)}</span>
                </div>
                ${order.delivery_fee > 0 ? `
                    <div class="summary-row">
                        <span>Delivery Fee:</span>
                        <span>₱${order.delivery_fee.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="summary-row total">
                    <span>Total:</span>
                    <span class="order-total">₱${order.total.toFixed(2)}</span>
                </div>
            </div>

            <div class="order-meta">
                <span class="order-time">
                    <i class="fas fa-clock"></i>
                    ${order.created_at_formatted}
                </span>
            </div>

            <div class="order-actions">
                <button class="btn btn-primary btn-sm" onclick="viewOrderDetail(${order.id})">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
                <button class="btn btn-secondary btn-sm" onclick="updateOrderStatusModal(${order.id}, '${order.payment_status}', '${order.fulfillment_status}')">
                    <i class="fas fa-edit"></i>
                    Update Status
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// ORDER ACTIONS
// ==========================================

function viewOrderDetail(orderId) {
    fetch(`/api/order/${orderId}/detail/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showOrderDetailModal(data.order);
            }
        })
        .catch(error => {
            console.error('Error loading order detail:', error);
            showNotification('Failed to load order details', 'error');
        });
}

function showOrderDetailModal(order) {
    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('detail-modal-body');

    modalBody.innerHTML = `
        <div class="order-detail-content">
            <div class="detail-section">
                <h3>Order Information</h3>
                <div class="detail-row">
                    <span>Order Number:</span>
                    <strong>${order.order_number}</strong>
                </div>
                <div class="detail-row">
                    <span>Order Date:</span>
                    <strong>${order.created_at}</strong>
                </div>
                <div class="detail-row">
                    <span>Payment Method:</span>
                    <strong>${order.payment_method}</strong>
                </div>
                ${order.payment_reference ? `
                    <div class="detail-row">
                        <span>Payment Reference:</span>
                        <strong>${order.payment_reference}</strong>
                    </div>
                ` : ''}
            </div>

            <div class="detail-section">
                <h3>Customer Information</h3>
                <div class="detail-row">
                    <span>Name:</span>
                    <strong>${order.customer.name}</strong>
                </div>
                <div class="detail-row">
                    <span>Email:</span>
                    <strong>${order.customer.email}</strong>
                </div>
                <div class="detail-row">
                    <span>Phone:</span>
                    <strong>${order.customer.phone}</strong>
                </div>
            </div>

            <div class="detail-section">
                <h3>Order Items</h3>
                <div class="detail-items">
                    ${order.items.map(item => `
                        <div class="detail-item">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>₱${item.total.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${order.notes ? `
                <div class="detail-section">
                    <h3>Notes</h3>
                    <div class="order-notes">${order.notes}</div>
                </div>
            ` : ''}
        </div>
    `;

    modal.classList.add('active');
}

function updateOrderStatusModal(orderId, currentPayment, currentFulfillment) {
    const modal = document.getElementById('status-modal');

    document.getElementById('payment-status-select').value = currentPayment;
    document.getElementById('fulfillment-status-select').value = currentFulfillment;
    document.getElementById('order-notes-input').value = '';

    modal.classList.add('active');

    // Update button handler
    const updateBtn = document.getElementById('status-update-btn');
    updateBtn.onclick = function() {
        updateOrderStatus(orderId);
    };
}

function updateOrderStatus(orderId) {
    const paymentStatus = document.getElementById('payment-status-select').value;
    const fulfillmentStatus = document.getElementById('fulfillment-status-select').value;
    const notes = document.getElementById('order-notes-input').value;

    const updateBtn = document.getElementById('status-update-btn');
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    fetch('/api/order/update-status/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            order_id: orderId,
            payment_status: paymentStatus,
            fulfillment_status: fulfillmentStatus,
            notes: notes
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Order status updated successfully', 'success');
            closeModal('status-modal');
            loadOrders();
            loadOrderStats();
        } else {
            showNotification(data.error || 'Failed to update order status', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating order status:', error);
        showNotification('Failed to update order status', 'error');
    })
    .finally(() => {
        updateBtn.disabled = false;
        updateBtn.innerHTML = 'Save Changes';
    });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-${icon}" style="font-size: 20px;"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function playNotificationSound() {
    const audio = new Audio('/static/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Could not play sound'));
}

function animateValue(element, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const value = Math.floor(start + (end - start) * progress);
        element.textContent = value;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

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

function exportOrders() {
    const params = new URLSearchParams(currentFilters);
    window.location.href = `/api/order-records/export/?${params}`;
    showNotification('Exporting orders...', 'success');
}

// Request notification permission
if (Notification.permission === "default") {
    Notification.requestPermission();
}