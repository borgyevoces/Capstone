// ==========================================
// ORDER MANAGEMENT SYSTEM - JavaScript
// Save as: static/js/order_management.js
// ==========================================

// ==========================================
// STATE MANAGEMENT
// ==========================================
const OrderManager = {
    currentOrder: null,
    orders: [],
    filters: {
        status: 'all',
        payment: 'all',
        date: 'today',
        search: ''
    },
    historyFilters: {
        payment_status: 'all',
        fulfillment_status: 'all',
        start_date: '',
        end_date: ''
    },
    refreshInterval: null,

    // Initialize the application
    init() {
        this.attachEventListeners();
        this.loadOrders();
        this.startAutoRefresh();
        this.setupViewSwitching();
    },

    // Event listeners
    attachEventListeners() {
        // Records view filters
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.loadOrders();
        });

        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.loadOrders();
        });

        document.getElementById('payment-filter')?.addEventListener('change', (e) => {
            this.filters.payment = e.target.value;
            this.loadOrders();
        });

        document.getElementById('date-filter')?.addEventListener('change', (e) => {
            this.filters.date = e.target.value;
            this.loadOrders();
        });

        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.loadOrders();
        });

        document.getElementById('export-btn')?.addEventListener('click', () => {
            this.exportToCSV();
        });

        // History view filters
        document.getElementById('history-payment-filter')?.addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        document.getElementById('history-fulfillment-filter')?.addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        document.getElementById('history-start-date')?.addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        document.getElementById('history-end-date')?.addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        document.getElementById('history-refresh-btn')?.addEventListener('click', () => {
            this.loadTransactionHistory();
        });

        // Status update modal
        document.getElementById('status-update-btn')?.addEventListener('click', () => {
            this.saveStatusUpdate();
        });

        // Modal close on outside click
        document.querySelectorAll('.modal')?.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal.id);
                }
            });
        });
    },

    // Setup view switching
    setupViewSwitching() {
        document.querySelectorAll('.nav-link[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
    },

    // Switch between views
    switchView(viewName) {
        // Update nav active state
        document.querySelectorAll('.nav-link[data-view]').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

        // Hide all views
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected view
        const viewElement = document.getElementById(`${viewName}-view`);
        if (viewElement) {
            viewElement.classList.add('active');
            if (viewName === 'history') {
                this.loadTransactionHistory();
            }
        }
    },

    // ==========================================
    // API CALLS
    // ==========================================

    // Load orders with filters
    async loadOrders() {
        try {
            const container = document.getElementById('orders-container');
            container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

            const params = new URLSearchParams({
                status: this.filters.status,
                payment: this.filters.payment,
                date: this.filters.date,
                search: this.filters.search
            });

            const response = await fetch(`/api/order-records/?${params}`);
            const data = await response.json();

            if (data.success) {
                this.orders = data.orders;
                this.updateStats(data.stats);
                this.renderOrders(data.orders);
            } else {
                this.showError(data.error || 'Failed to load orders');
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('An error occurred while loading orders');
        }
    },

    // Load transaction history
    async loadTransactionHistory() {
        try {
            const container = document.getElementById('history-container');
            container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

            const params = new URLSearchParams({
                payment_status: document.getElementById('history-payment-filter').value || 'all',
                fulfillment_status: document.getElementById('history-fulfillment-filter').value || 'all',
                start_date: document.getElementById('history-start-date').value || '',
                end_date: document.getElementById('history-end-date').value || '',
                page: 1,
                per_page: 50
            });

            const response = await fetch(`/api/transaction-history/?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderTransactionHistory(data.transactions);
            } else {
                this.showError(data.error || 'Failed to load transaction history');
            }
        } catch (error) {
            console.error('Error loading history:', error);
            this.showError('An error occurred while loading transaction history');
        }
    },

    // Get order details
    async getOrderDetail(orderId) {
        try {
            const response = await fetch(`/api/order/${orderId}/detail/`);
            const data = await response.json();

            if (data.success) {
                return data.order;
            } else {
                this.showError(data.error || 'Failed to load order details');
                return null;
            }
        } catch (error) {
            console.error('Error fetching order details:', error);
            this.showError('An error occurred while fetching order details');
            return null;
        }
    },

    // Update order status
    async updateOrderStatus(orderId, statusType, newStatus) {
        try {
            const response = await fetch('/api/order/update-status/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    order_id: orderId,
                    status_type: statusType,
                    new_status: newStatus
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Order status updated successfully');
                this.loadOrders();
                return true;
            } else {
                this.showError(data.error || 'Failed to update order status');
                return false;
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('An error occurred while updating the status');
            return false;
        }
    },

    // Add order note
    async addOrderNote(orderId, note) {
        try {
            const response = await fetch('/api/order/add-note/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    order_id: orderId,
                    note: note
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Note added successfully');
                return true;
            } else {
                this.showError(data.error || 'Failed to add note');
                return false;
            }
        } catch (error) {
            console.error('Error adding note:', error);
            this.showError('An error occurred while adding the note');
            return false;
        }
    },

    // ==========================================
    // RENDERING
    // ==========================================

    // Render orders table
    renderOrders(orders) {
        const container = document.getElementById('orders-container');

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h3 class="empty-title">No Orders Found</h3>
                    <p class="empty-message">Try adjusting your filters or check back later.</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-wrapper">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Payment</th>
                            <th>Fulfillment</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => this.renderOrderRow(order)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;

        // Attach event listeners to action buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = e.currentTarget.dataset.action;
                const orderId = parseInt(e.currentTarget.dataset.orderId);

                if (action === 'view') {
                    await this.openDetailModal(orderId);
                } else if (action === 'update') {
                    await this.openStatusModal(orderId);
                }
            });
        });
    },

    // Render single order row
    renderOrderRow(order) {
        return `
            <tr>
                <td>
                    <span class="order-id" data-order-id="${order.id}" style="cursor: pointer;">
                        ${order.order_number}
                    </span>
                </td>
                <td>
                    <div class="customer-info-cell">
                        <div class="customer-avatar">${this.getInitials(order.customer.name)}</div>
                        <div class="customer-details">
                            <div class="customer-name">${this.escapeHtml(order.customer.name)}</div>
                            <div class="customer-email">${this.escapeHtml(order.customer.email)}</div>
                        </div>
                    </div>
                </td>
                <td>${order.items.length} item${order.items.length !== 1 ? 's' : ''}</td>
                <td><strong>₱${this.formatCurrency(order.total)}</strong></td>
                <td>
                    <span class="status-badge ${order.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}"
                          onclick="OrderManager.togglePaymentStatus(${order.id}, '${order.payment_status}')">
                        <i class="fas fa-${order.payment_status === 'paid' ? 'check-circle' : 'exclamation-circle'}"></i>
                        ${order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${order.fulfillment_status === 'claimed' ? 'badge-claimed' : 'badge-pending'}"
                          onclick="OrderManager.toggleFulfillmentStatus(${order.id}, '${order.fulfillment_status}')">
                        <i class="fas fa-${order.fulfillment_status === 'claimed' ? 'check-circle' : 'clock'}"></i>
                        ${order.fulfillment_status === 'claimed' ? 'Claimed' : 'Pending'}
                    </span>
                </td>
                <td>${order.created_at_formatted}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" data-action="view" data-order-id="${order.id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" data-action="update" data-order-id="${order.id}" title="Update Status">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    // Render transaction history
    renderTransactionHistory(transactions) {
        const container = document.getElementById('history-container');

        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <h3 class="empty-title">No Transactions Found</h3>
                    <p class="empty-message">No transactions match your filters.</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-wrapper">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Payment</th>
                            <th>Fulfillment</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(tx => `
                            <tr>
                                <td><span class="order-id">${tx.order_number}</span></td>
                                <td>
                                    <div>
                                        <div class="customer-name">${this.escapeHtml(tx.customer_name)}</div>
                                        <div class="customer-email" style="font-size: 12px;">${this.escapeHtml(tx.customer_email)}</div>
                                    </div>
                                </td>
                                <td><strong>₱${this.formatCurrency(tx.total)}</strong></td>
                                <td>
                                    <span class="status-badge ${tx.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">
                                        ${tx.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge ${tx.fulfillment_status === 'claimed' ? 'badge-claimed' : 'badge-pending'}">
                                        ${tx.fulfillment_status === 'claimed' ? 'Claimed' : 'Pending'}
                                    </span>
                                </td>
                                <td>${tx.created_at_formatted}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    },

    // ==========================================
    // MODALS
    // ==========================================

    // Open order detail modal
    async openDetailModal(orderId) {
        const order = await this.getOrderDetail(orderId);
        if (!order) return;

        const modalBody = document.getElementById('detail-modal-body');
        modalBody.innerHTML = `
            <div class="detail-section">
                <h3 class="detail-title">Order Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Order Number</span>
                    <span class="detail-value">${order.order_number}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${order.created_at_formatted}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Status</span>
                    <span class="status-badge ${order.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">
                        ${order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fulfillment Status</span>
                    <span class="status-badge ${order.fulfillment_status === 'claimed' ? 'badge-claimed' : 'badge-pending'}">
                        ${order.fulfillment_status === 'claimed' ? 'Claimed' : 'Pending'}
                    </span>
                </div>
            </div>

            <div class="detail-section">
                <h3 class="detail-title">Customer Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Name</span>
                    <span class="detail-value">${this.escapeHtml(order.customer.name)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${this.escapeHtml(order.customer.email)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone</span>
                    <span class="detail-value">${order.customer.phone}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Address</span>
                    <span class="detail-value">${this.escapeHtml(order.customer.address)}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3 class="detail-title">Order Items</h3>
                <div class="items-list">
                    ${order.items.map(item => `
                        <div class="item-row">
                            <div class="item-info">
                                <div class="item-name">${this.escapeHtml(item.name)}</div>
                                <div class="item-qty">Qty: ${item.quantity}</div>
                            </div>
                            <div class="item-price">₱${this.formatCurrency(item.total)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="detail-section">
                <h3 class="detail-title">Order Summary</h3>
                <div class="detail-row">
                    <span class="detail-label">Subtotal</span>
                    <span class="detail-value">₱${this.formatCurrency(order.subtotal)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Delivery Fee</span>
                    <span class="detail-value">₱${this.formatCurrency(order.delivery_fee)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total</span>
                    <span class="detail-value amount">₱${this.formatCurrency(order.total)}</span>
                </div>
            </div>

            ${order.notes ? `
                <div class="detail-section">
                    <h3 class="detail-title">Notes</h3>
                    <p style="color: var(--text-secondary);">${this.escapeHtml(order.notes)}</p>
                </div>
            ` : ''}
        `;

        openModal('detail-modal');
    },

    // Open status update modal
    async openStatusModal(orderId) {
        this.currentOrder = orderId;

        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        document.getElementById('payment-status-select').value = order.payment_status;
        document.getElementById('fulfillment-status-select').value = order.fulfillment_status;
        document.getElementById('order-notes-input').value = order.notes || '';

        openModal('status-modal');
    },

    // Save status update
    async saveStatusUpdate() {
        const orderId = this.currentOrder;
        const paymentStatus = document.getElementById('payment-status-select').value;
        const fulfillmentStatus = document.getElementById('fulfillment-status-select').value;
        const notes = document.getElementById('order-notes-input').value;

        // Update payment status
        if (this.orders.find(o => o.id === orderId)?.payment_status !== paymentStatus) {
            await this.updateOrderStatus(orderId, 'payment', paymentStatus);
        }

        // Update fulfillment status
        if (this.orders.find(o => o.id === orderId)?.fulfillment_status !== fulfillmentStatus) {
            await this.updateOrderStatus(orderId, 'fulfillment', fulfillmentStatus);
        }

        // Update notes
        if (notes) {
            await this.addOrderNote(orderId, notes);
        }

        closeModal('status-modal');
    },

    // Toggle payment status with quick click
    async togglePaymentStatus(orderId, currentStatus) {
        const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
        await this.updateOrderStatus(orderId, 'payment', newStatus);
    },

    // Toggle fulfillment status with quick click
    async toggleFulfillmentStatus(orderId, currentStatus) {
        const newStatus = currentStatus === 'claimed' ? 'pending' : 'claimed';
        await this.updateOrderStatus(orderId, 'fulfillment', newStatus);
    },

    // ==========================================
    // UTILITIES
    // ==========================================

    // Update stats display
    updateStats(stats) {
        document.getElementById('stat-total-orders').textContent = stats.total_orders;
        document.getElementById('stat-pending').textContent = stats.pending;
        document.getElementById('stat-completed').textContent = stats.completed;
        document.getElementById('stat-unpaid').textContent = stats.unpaid;
    },

    // Export to CSV
    exportToCSV() {
        if (this.orders.length === 0) {
            this.showError('No data to export');
            return;
        }

        let csv = 'Order ID,Customer,Email,Total,Payment Status,Fulfillment Status,Date\n';

        this.orders.forEach(order => {
            csv += `"${order.order_number}",${this.escapeHtml(order.customer.name)},${order.customer.email},₱${order.total},${order.payment_status},${order.fulfillment_status},"${order.created_at_formatted}"\n`;
        });

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
        element.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        this.showSuccess('Orders exported successfully');
    },

    // Format currency
    formatCurrency(value) {
        return parseFloat(value).toFixed(2);
    },

    // Get initials from name
    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Get CSRF token
    getCsrfToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === name + '=') {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    },

    // Show success message
    showSuccess(message) {
        this.showNotification(message, 'success');
    },

    // Show error message
    showError(message) {
        this.showNotification(message, 'error');
    },

    // Show notification
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : '#EF4444'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            animation: slideInUp 0.3s ease;
            max-width: 400px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Auto-refresh orders every 30 seconds
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            const activeView = document.querySelector('.view-section.active');
            if (activeView.id === 'records-view') {
                this.loadOrders();
            }
        }, 30000); // 30 seconds
    }
};

// ==========================================
// GLOBAL FUNCTIONS
// ==========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    OrderManager.init();
});