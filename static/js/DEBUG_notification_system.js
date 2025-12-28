// ==========================================
// 🔥 SUPER DEBUG VERSION - INSTANT NOTIFICATION DETECTION
// ==========================================
console.log('🚀 NOTIFICATION SYSTEM LOADING...');

// Store interval ID globally so we can clear it if needed
let notificationPollingInterval = null;
let lastKnownNotificationId = 0;

// ==========================================
// 🔔 SUPER FAST POLLING - 2 SECONDS!
// ==========================================
function startSuperFastNotificationPolling() {
    console.log('🔥 STARTING SUPER FAST NOTIFICATION POLLING (2 SECOND INTERVAL)');

    // Clear any existing interval
    if (notificationPollingInterval) {
        clearInterval(notificationPollingInterval);
    }

    // Load immediately
    checkForNewNotifications();

    // Then check every 2 seconds
    notificationPollingInterval = setInterval(() => {
        checkForNewNotifications();
    }, 2000); // 2 seconds for INSTANT detection

    console.log('✅ Polling started - checking every 2 seconds');
}

// ==========================================
// 🔍 CHECK FOR NEW NOTIFICATIONS
// ==========================================
function checkForNewNotifications() {
    const timestamp = Date.now();
    const random = Math.random();
    const url = `/api/notifications/?t=${timestamp}&r=${random}`;

    console.log(`🔍 [${new Date().toLocaleTimeString()}] Checking for notifications...`);

    fetch(url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken'),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
    .then(response => {
        console.log(`📡 Response status: ${response.status}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('📦 RAW DATA:', data);

        if (!data.success) {
            console.error('❌ API returned success: false');
            return;
        }

        const notificationCount = data.notifications ? data.notifications.length : 0;
        const unreadCount = data.unread_count || 0;

        console.log(`✅ Found ${notificationCount} total notifications, ${unreadCount} unread`);

        // Update badge
        updateNotificationBadge(unreadCount);

        // Check for NEW notifications
        if (data.notifications && data.notifications.length > 0) {
            const latest = data.notifications[0];
            console.log('🆕 Latest notification:', latest);

            // If this is a new notification we haven't seen
            if (latest.id > lastKnownNotificationId) {
                console.log('🎉 NEW NOTIFICATION DETECTED! ID:', latest.id);
                lastKnownNotificationId = latest.id;

                // Show toast notification
                showBigToast(latest);

                // Update the panel if it's open
                updateNotificationPanel(data.notifications);

                // Play sound alert (optional)
                playNotificationSound();
            }
        }
    })
    .catch(error => {
        console.error('❌ FETCH ERROR:', error);
    });
}

// ==========================================
// 🎨 UPDATE NOTIFICATION PANEL
// ==========================================
function updateNotificationPanel(notifications) {
    const list = document.getElementById('notificationList');
    const emptyState = document.getElementById('emptyNotifications');

    if (!list) {
        console.warn('⚠️ Notification list element not found');
        return;
    }

    if (notifications && notifications.length > 0) {
        console.log(`📝 Rendering ${notifications.length} notifications`);
        list.innerHTML = notifications.map(n => renderNotification(n)).join('');

        if (emptyState) {
            emptyState.style.display = 'none';
        }
    } else {
        console.log('📭 No notifications to display');
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #9ca3af;">
                <i class="fas fa-bell-slash fa-2x"></i>
                <p style="margin-top: 16px;">No new notifications</p>
            </div>
        `;

        if (emptyState) {
            emptyState.style.display = 'block';
        }
    }
}

// ==========================================
// 🎨 RENDER NOTIFICATION CARD
// ==========================================
function renderNotification(notif) {
    const customerInitial = notif.customer && notif.customer.name ?
        notif.customer.name.charAt(0).toUpperCase() : '?';

    const statusClass = notif.is_paid ? 'paid' : 'pending';

    let orderItemsHTML = '';
    if (notif.order && notif.order.items && notif.order.items.length > 0) {
        orderItemsHTML = notif.order.items.map(item => `
            <div class="order-item-row">
                <span class="item-name-qty">
                    <strong>${item.quantity}x</strong> ${item.name}
                </span>
                <span class="item-price">₱${parseFloat(item.total).toFixed(2)}</span>
            </div>
        `).join('');
    }

    return `
        <div class="notification-item ${notif.is_new ? 'unread' : ''}"
             data-notification-id="${notif.id}"
             onclick="markAsRead(${notif.id})">

            <div class="notification-header">
                <div class="notification-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">
                        New Order Received
                        <span class="notification-type-badge">NEW ORDER</span>
                        ${notif.is_paid ? '<span class="notification-type-badge" style="background: #10b981;">PAID</span>' : ''}
                    </div>
                    <div class="notification-message">${notif.message}</div>
                </div>
            </div>

            <div class="customer-info">
                <div class="customer-avatar">${customerInitial}</div>
                <div class="customer-details">
                    <div class="customer-name">${notif.customer ? notif.customer.name : 'Unknown'}</div>
                    <div class="customer-email">${notif.customer ? notif.customer.email : 'N/A'}</div>
                </div>
            </div>

            <div class="order-summary">
                <div class="order-summary-header">
                    <span class="order-id">Order #${notif.order ? notif.order.id : 'N/A'}</span>
                    <span class="order-total">₱${notif.order ? parseFloat(notif.order.total_amount).toFixed(2) : '0.00'}</span>
                </div>

                ${notif.order && notif.order.reference_number && notif.order.reference_number !== 'N/A' ? `
                    <div class="order-reference">
                        <i class="fas fa-hashtag"></i> GCash Ref: ${notif.order.reference_number}
                    </div>
                ` : ''}

                <div class="order-items-list">
                    ${orderItemsHTML}
                </div>

                <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <span class="order-status-badge ${statusClass}">
                        <i class="fas fa-${notif.is_paid ? 'check-circle' : 'clock'}"></i>
                        ${notif.order ? notif.order.status : 'UNKNOWN'}
                    </span>
                    <span style="font-size: 12px; color: #6b7280;">
                        ${notif.order ? notif.order.item_count : 0} item${(notif.order && notif.order.item_count > 1) ? 's' : ''}
                    </span>
                </div>
            </div>

            <div class="notification-time">
                <i class="far fa-clock"></i>
                <span class="time-ago">${notif.time_ago || 'Just now'}</span>
                <span style="margin-left: auto; font-size: 11px;">
                    ${notif.created_at || ''}
                </span>
            </div>

            ${notif.payment_confirmed_at ? `
                <div class="notification-time" style="margin-top: 4px; color: #10b981;">
                    <i class="fas fa-check-circle"></i>
                    <span>Paid: ${notif.payment_confirmed_at}</span>
                </div>
            ` : ''}
        </div>
    `;
}

// ==========================================
// 🎊 BIG TOAST NOTIFICATION
// ==========================================
function showBigToast(notif) {
    console.log('🎊 Showing BIG TOAST for notification:', notif.id);

    // Remove any existing toasts
    const existing = document.querySelectorAll('.mega-toast');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'mega-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        padding: 24px;
        min-width: 400px;
        max-width: 500px;
        z-index: 999999;
        animation: slideInBounce 0.5s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: start; gap: 20px;">
            <div style="
                width: 60px;
                height: 60px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                flex-shrink: 0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            ">
                🛒
            </div>
            <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">
                    💰 New Order Alert!
                </div>
                <div style="font-size: 16px; opacity: 0.95; margin-bottom: 4px;">
                    Order #${notif.order ? notif.order.id : '?'}
                </div>
                <div style="font-size: 14px; opacity: 0.9;">
                    ${notif.customer ? notif.customer.name : 'Customer'} • ₱${notif.order ? parseFloat(notif.order.total_amount).toFixed(2) : '0.00'}
                </div>
                ${notif.order && notif.order.reference_number && notif.order.reference_number !== 'N/A' ? `
                    <div style="
                        margin-top: 12px;
                        padding: 8px 12px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 8px;
                        font-size: 13px;
                        font-family: 'Courier New', monospace;
                    ">
                        🔖 ${notif.order.reference_number}
                    </div>
                ` : ''}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                flex-shrink: 0;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                ×
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 8000);
}

// ==========================================
// 🔔 NOTIFICATION SOUND
// ==========================================
function playNotificationSound() {
    try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        console.log('🔊 Notification sound played');
    } catch (e) {
        console.log('🔇 Could not play sound:', e.message);
    }
}

// ==========================================
// 🏷️ UPDATE BADGE
// ==========================================
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'block';
            console.log(`🔔 Badge updated: ${count}`);
        } else {
            badge.style.display = 'none';
            console.log('🔕 Badge hidden');
        }
    }
}

// ==========================================
// ✅ MARK AS READ
// ==========================================
function markAsRead(notificationId) {
    console.log(`✅ Marking notification ${notificationId} as read`);

    fetch(`/api/notifications/${notificationId}/mark-read/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (element) {
                element.classList.remove('unread');
            }
            updateNotificationBadge(data.unread_count);
        }
    })
    .catch(error => {
        console.error('❌ Error marking as read:', error);
    });
}

// ==========================================
// 🍪 GET CSRF COOKIE
// ==========================================
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

// ==========================================
// 🎬 START ON PAGE LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 PAGE LOADED - STARTING SUPER FAST NOTIFICATION SYSTEM');
    console.log('📍 URL:', window.location.href);
    console.log('⏰ Time:', new Date().toLocaleString());

    // Start immediately
    startSuperFastNotificationPolling();

    console.log('✅ NOTIFICATION SYSTEM ACTIVE - POLLING EVERY 2 SECONDS');
});

// Add animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInBounce {
        0% {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
        }
        60% {
            transform: translateX(-10px) scale(1.02);
        }
        100% {
            transform: translateX(0) scale(1);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(120%);
            opacity: 0;
        }
    }

    .mega-toast:hover {
        transform: scale(1.02);
        box-shadow: 0 15px 50px rgba(0,0,0,0.4) !important;
    }
`;
document.head.appendChild(style);

console.log('🎉 SUPER DEBUG NOTIFICATION SYSTEM LOADED!');
console.log('👀 Watch console for real-time updates');
console.log('⚡ Polling every 2 seconds for INSTANT notifications');