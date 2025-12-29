// ==========================================
// FOOD ESTABLISHMENT DASHBOARD JS - COMPLETE
// ==========================================

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let isSubmitting = false;
let mapInitialized = false;
let currentGeocodedAddress = '';

// ==========================================
// NOTIFICATION SYSTEM
// ==========================================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert ${type}`;

    const iconMap = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'info': 'info-circle',
        'warning': 'exclamation-triangle'
    };

    notification.innerHTML = `
        <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
        <span class="alert-message">${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 300ms ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
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

// ==========================================
// NOTIFICATION RENDERER (UPDATED)
// ==========================================
// ✅ Dito binago ang itsura para makita ang Name, Gmail, Items, at Price
function renderNotification(notif) {
    const isUnread = notif.is_new ? 'unread' : '';
    const statusClass = notif.order.status.toLowerCase();
    const customerInitial = notif.customer.name.charAt(0).toUpperCase();

    // Format order items list
    const orderItemsHTML = notif.order.items.map(item => `
        <div class="order-item-row" style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed #eee;">
            <div class="item-name-qty">
                <span style="color: #333; font-weight: 600;">${item.name}</span>
                <span style="color: #666;">x${item.quantity}</span>
            </div>
            <div class="item-price" style="color: #B71C1C; font-weight: 600;">₱${item.total.toFixed(2)}</div>
        </div>
    `).join('');

    return `
        <div class="notification-item ${isUnread}" onclick="markNotificationRead(${notif.id})" data-notification-id="${notif.id}" style="border-left: 4px solid ${notif.is_paid ? '#10b981' : '#f59e0b'};">

            <div class="notification-header" style="margin-bottom: 8px;">
                <div class="notification-title" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; color: #1a1a1a;">
                        <i class="fas fa-clipboard-list" style="color: #667eea;"></i> Order #${notif.order.id}
                    </span>
                    <span class="notification-type-badge" style="background: ${notif.is_paid ? '#d1fae5' : '#fffbeb'}; color: ${notif.is_paid ? '#059669' : '#d97706'}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">
                        ${notif.order.status}
                    </span>
                </div>
            </div>

            <!-- ✅ CUSTOMER DETAILS (Name & Gmail) -->
            <div class="customer-info" style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="customer-avatar" style="width: 32px; height: 32px; font-size: 14px;">${customerInitial}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 14px; color: #1e293b;">${notif.customer.name}</div>
                        <div style="font-size: 12px; color: #64748b;">
                            <i class="fas fa-envelope"></i> ${notif.customer.email}
                        </div>
                    </div>
                </div>
            </div>

            <!-- ✅ ORDER SUMMARY (Items & Total Price) -->
            <div class="order-summary" style="border-top: none; padding-top: 0;">
                <div style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Order Summary</div>

                <div class="order-items-list" style="background: #fff; border: 1px solid #f1f5f9; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
                    ${orderItemsHTML}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
                    <span style="font-size: 13px; font-weight: 600; color: #475569;">Total Amount:</span>
                    <span style="font-size: 16px; font-weight: 800; color: #B71C1C;">₱${notif.order.total_amount.toFixed(2)}</span>
                </div>

                ${notif.order.reference_number !== 'N/A' ? `
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px; text-align: right;">
                        Ref: <span style="font-family: monospace;">${notif.order.reference_number}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Timestamp -->
            <div class="notification-time" style="margin-top: 10px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
                <span><i class="far fa-clock"></i> ${notif.time_ago}</span>
                <span>${notif.created_at}</span>
            </div>
        </div>
    `;
}

// ==========================================
// NOTIFICATION & TOAST FUNCTIONS
// ==========================================

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
    } else {
        panel.classList.add('open');
        loadNotifications();
    }
}

function loadNotifications() {
    fetch('/api/notifications/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const list = document.getElementById('notificationList');

            if (data.notifications && data.notifications.length > 0) {
                list.innerHTML = data.notifications.map(notif => renderNotification(notif)).join('');
                updateNotificationBadge(data.unread_count);
            } else {
                list.innerHTML = `
                    <div class="notification-empty-state">
                        <i class="fas fa-bell-slash"></i>
                        <p>No new notifications</p>
                    </div>
                `;
                updateNotificationBadge(0);
            }
        }
    })
    .catch(error => {
        console.error('Error loading notifications:', error);
    });
}

function pollNotifications() {
    // Poll even if panel is closed to show toast and update badge
    fetch('/api/notifications/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update badge
            updateNotificationBadge(data.unread_count);

            // Check for NEW notifications to show toast
            if (data.notifications && data.notifications.length > 0) {
                const latestNotif = data.notifications[0];

                // Simple check: if we haven't shown this toast yet (using sessionStorage)
                const lastToastId = sessionStorage.getItem('lastToastId');

                if (latestNotif.is_new && (!lastToastId || parseInt(lastToastId) !== latestNotif.id)) {
                    showToastNotification(latestNotif);
                    sessionStorage.setItem('lastToastId', latestNotif.id);

                    // If panel is open, refresh the list too
                    if (document.getElementById('notificationPanel').classList.contains('open')) {
                        loadNotifications();
                    }
                }
            }
        }
    })
    .catch(error => {
        console.error('Error polling notifications:', error);
    });
}

function showToastNotification(notif) {
    // Play sound notification
    try {
        const audio = new Audio('/static/sounds/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed (interaction needed)'));
    } catch(e) {}

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.cssText = `
        position: fixed; top: 90px; right: 20px; background: white; border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15); padding: 16px; display: flex; align-items: flex-start;
        gap: 12px; z-index: 10000; min-width: 320px; animation: slideIn 0.3s ease; border-left: 4px solid #10b981;
    `;

    const itemsSummary = notif.order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    toast.innerHTML = `
        <div class="toast-icon" style="background: #e0f2fe; color: #0284c7; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas fa-receipt"></i>
        </div>
        <div class="toast-content" style="flex: 1;">
            <div class="toast-title" style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">New Order Received!</div>
            <div class="toast-message" style="font-size: 13px; color: #475569;">
                <strong>${notif.customer.name}</strong> paid <strong>₱${notif.order.total_amount.toFixed(2)}</strong> via GCash.
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">
                ${itemsSummary}
            </div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()" style="background: none; border: none; color: #94a3b8; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideOut 300ms ease';
        setTimeout(() => toast.remove(), 300);
    }, 8000);
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex'; // Changed to flex for centering
        } else {
            badge.style.display = 'none';
        }
    }
}

function markNotificationRead(notificationId) {
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
            const notifElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notifElement) {
                notifElement.classList.remove('unread');
            }
            updateNotificationBadge(data.unread_count);
        }
    })
    .catch(error => {
        console.error('Error marking notification as read:', error);
    });
}

function markAllNotificationsRead() {
    fetch('/api/notifications/mark-all-read/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadNotifications();
            showNotification('✅ All notifications marked as read', 'success');
            updateNotificationBadge(0);
        }
    })
    .catch(error => {
        console.error('Error marking all notifications as read:', error);
    });
}

// ==========================================
// FORM HANDLERS (Menu Add/Edit/Update)
// ==========================================

function setupAddMenuItemForm() {
    const addMenuForm = document.getElementById('addMenuItemForm');
    if (!addMenuForm) return;

    // Clone to remove old listeners
    const newForm = addMenuForm.cloneNode(true);
    addMenuForm.parentNode.replaceChild(newForm, addMenuForm);

    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (isSubmitting) return;

        const formData = new FormData(this);
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        isSubmitting = true;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

        fetch(window.location.href, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('✅ ' + data.message, 'success');
                if (data.item) addMenuItemToGrid(data.item);
                newForm.reset();

                // Update token if provided
                if(data.new_menu_token) {
                    const tokenInput = newForm.querySelector('input[name="menu_add_token"]');
                    if(tokenInput) tokenInput.value = data.new_menu_token;
                }
            } else {
                showNotification('❌ ' + (data.error || 'Failed to add item'), 'error');
            }
        })
        .catch(error => {
            showNotification('❌ ' + error.message, 'error');
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            isSubmitting = false;
        });
    });
}

function addMenuItemToGrid(item) {
    const menuGrid = document.querySelector('.menu-grid');
    const noItems = document.querySelector('.no-items');
    if (noItems) noItems.remove();

    const menuCard = document.createElement('div');
    menuCard.className = 'menu-card';
    menuCard.dataset.itemId = item.id;
    menuCard.dataset.itemName = item.name;
    menuCard.dataset.itemDescription = item.description;
    menuCard.dataset.itemPrice = item.price;
    menuCard.dataset.itemQuantity = item.quantity;
    menuCard.dataset.itemImageUrl = item.image_url;

    menuCard.innerHTML = `
        <div class="menu-image">
            <img src="${item.image_url || '/static/images/default_menu_item.png'}" alt="${item.name}">
            <div class="badges-container">
                ${item.is_top_seller ? '<span class="badge bestseller"><i class="fas fa-award"></i> Best Seller</span>' : ''}
                ${item.quantity > 0 ?
                    `<span class="badge available">Available: ${item.quantity}</span>` :
                    '<span class="badge soldout">Out of Stock</span>'}
            </div>
        </div>
        <div class="menu-info">
            <div class="menu-name">${item.name}</div>
            <div class="menu-desc">${item.description}</div>
            <div class="menu-price">₱${parseFloat(item.price).toFixed(2)}</div>
            <div class="menu-actions">
                <button class="action-btn edit" onclick="openEditModal('${item.id}')"><i class="fas fa-pen"></i> Edit</button>
                <form action="/owner/dashboard/toggle_top_seller/${item.id}/" method="post" style="display: contents;">
                    <input type="hidden" name="csrfmiddlewaretoken" value="${getCookie('csrftoken')}">
                    <button type="submit" class="action-btn seller"><i class="fas fa-award"></i> ${item.is_top_seller ? 'Unmark' : 'Mark'}</button>
                </form>
                <button type="button" class="action-btn delete" onclick="deleteMenuItem('${item.id}', this)"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `;

    if (!menuGrid) {
        const section = document.querySelector('.menu-section');
        const grid = document.createElement('div');
        grid.className = 'menu-grid';
        grid.appendChild(menuCard);
        section.appendChild(grid);
    } else {
        menuGrid.prepend(menuCard); // Add to top
    }
}

// ==========================================
// UPDATE STORE DETAILS FORM
// ==========================================
function setupUpdateStoreDetailsForm() {
    const updateForm = document.getElementById('updateStoreDetailsForm');

    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            // Validate coordinates
            const latitude = formData.get('latitude');
            const longitude = formData.get('longitude');

            if (!latitude || !longitude) {
                showNotification('⚠️ Please set your location on the map', 'warning');
                return;
            }

            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.name) {
                        document.getElementById('establishmentName').textContent = data.name;
                        document.title = `${data.name} - Dashboard`;
                    }

                    if (data.address) {
                        document.getElementById('establishmentAddress').textContent = data.address;
                    }

                    if (data.status) {
                        const statusBadge = document.getElementById('establishmentStatus');
                        statusBadge.textContent = data.status;
                        statusBadge.className = `status-badge ${data.status.toLowerCase() === 'open' ? 'open' : 'closed'}`;
                    }

                    if (data.category) {
                        document.getElementById('establishmentCategory').textContent = data.category || 'N/A';
                    }
                    const hoursElement = document.getElementById('establishmentHours');
                    if (hoursElement) {
                        if (data.opening_time && data.closing_time) {
                            hoursElement.textContent = `${data.opening_time} - ${data.closing_time}`;
                        } else {
                            hoursElement.textContent = 'Not Set';
                        }
                    }

                    if (data.amenities) {
                        document.getElementById('establishmentAmenities').textContent = data.amenities || 'N/A';
                    }

                    if (data.payment_methods) {
                        document.getElementById('establishmentPaymentMethods').textContent = data.payment_methods || 'N/A';
                    }

                    if (data.image_url) {
                        document.getElementById('profileImageView').src = data.image_url;
                        document.getElementById('storeCoverPhoto').src = data.image_url;
                    }

                    showNotification('✅ Store details updated successfully!', 'success');

                    setTimeout(() => {
                        closeModal('updateStoreDetailsModal');
                    }, 1000);
                } else {
                    showNotification('❌ ' + (data.error || 'Failed to update store details'), 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('❌ An error occurred while updating', 'error');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            });
        });
    }
}

// ==========================================
// EDIT MENU ITEM
// ==========================================
function setupEditMenuItemForm() {
    const editForm = document.getElementById('editMenuItemForm');

    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('✅ ' + data.message, 'success');
                    updateMenuItemInGrid(data.item);

                    setTimeout(() => {
                        closeModal('editMenuItemModal');
                    }, 1000);
                } else {
                    showNotification('❌ ' + (data.error || 'Failed to update menu item'), 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('❌ An error occurred while updating', 'error');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            });
        });
    }
}

// ==========================================
// UPDATE MENU ITEM IN GRID
// ==========================================
function updateMenuItemInGrid(item) {
    const menuCard = document.querySelector(`.menu-card[data-item-id="${item.id}"]`);
    if (!menuCard) return;

    menuCard.dataset.itemName = item.name;
    menuCard.dataset.itemDescription = item.description;
    menuCard.dataset.itemPrice = item.price;
    menuCard.dataset.itemQuantity = item.quantity || 0;
    if (item.image_url) {
        menuCard.dataset.itemImageUrl = item.image_url;
    }

    const img = menuCard.querySelector('.menu-image img');
    if (item.image_url && img) {
        img.src = item.image_url;
    }

    const badgesContainer = menuCard.querySelector('.badges-container');
    badgesContainer.innerHTML = `
        ${item.is_top_seller ? '<span class="badge bestseller"><i class="fas fa-award"></i> Best Seller</span>' : ''}
        ${item.quantity > 0 ?
            `<span class="badge available">Available: ${item.quantity}</span>` :
            '<span class="badge soldout">Out of Stock</span>'}
    `;

    menuCard.querySelector('.menu-name').textContent = item.name;
    menuCard.querySelector('.menu-desc').textContent = item.description;
    menuCard.querySelector('.menu-price').textContent = `₱${parseFloat(item.price).toFixed(2)}`;

    menuCard.style.animation = 'pulse 0.5s ease';
    setTimeout(() => {
        menuCard.style.animation = '';
    }, 500);
}

// ==========================================
// DELETE MENU ITEM
// ==========================================
function deleteMenuItem(itemId, button) {
    if (!confirm('Are you sure you want to delete this menu item? This action cannot be undone.')) {
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

    const csrfToken = getCookie('csrftoken');

    fetch(`/owner/dashboard/delete_menu_item/${itemId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const menuCard = document.querySelector(`.menu-card[data-item-id="${itemId}"]`);
            if (menuCard) {
                menuCard.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    menuCard.remove();

                    const remainingItems = document.querySelectorAll('.menu-card');
                    if (remainingItems.length === 0) {
                        const menuGrid = document.querySelector('.menu-grid');
                        if (menuGrid) {
                            menuGrid.innerHTML = `
                                <div class="no-items" style="grid-column: 1/-1;">
                                    <i class="fas fa-inbox"></i>
                                    <p>No menu items yet. Add your first item to get started!</p>
                                </div>
                            `;
                        }
                    }
                }, 300);
            }

            showNotification('✅ ' + data.message, 'success');
        } else {
            showNotification('❌ ' + data.message, 'error');
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-trash"></i> Delete';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('❌ An error occurred', 'error');
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-trash"></i> Delete';
    });
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    if (id === 'mapModal' && window._kabsueats_map) {
        try {
            window._kabsueats_map.remove();
        } catch (err) {}
        window._kabsueats_map = null;
        window._kabsueats_marker = null;
    }
}

// ==========================================
// EDIT MODAL
// ==========================================
function openEditModal(itemId) {
    const itemCard = document.querySelector(`.menu-card[data-item-id="${itemId}"]`);
    if (!itemCard) return;

    const form = document.getElementById('editMenuItemForm');
    form.action = `/owner/dashboard/edit_menu_item/${itemId}/`;

    document.getElementById('edit_item_id').value = itemId;
    document.getElementById('edit_item_name').value = itemCard.dataset.itemName || '';
    document.getElementById('edit_item_description').value = itemCard.dataset.itemDescription || '';
    document.getElementById('edit_item_price').value = itemCard.dataset.itemPrice || '';
    document.getElementById('id_quantity_edit').value = itemCard.dataset.itemQuantity || 0;

    const imageUrl = itemCard.dataset.itemImageUrl || '';
    const currentImg = document.getElementById('edit_current_item_image');
    if (imageUrl) {
        currentImg.src = imageUrl;
        currentImg.style.display = 'block';
    } else {
        currentImg.style.display = 'none';
    }

    openModal('editMenuItemModal');
}

// ==========================================
// PROFILE IMAGE MODAL
// ==========================================
function openProfileImageModal() {
    const img = document.getElementById('profileImageView');
    const modalImg = document.getElementById('ownerModalImageView');
    if (img && modalImg) {
        modalImg.src = img.src;
        openModal('ownerProfileImageModal');
    }
}

// ==========================================
// DROPDOWN MENU
// ==========================================
function toggleDropdown() {
    const menu = document.getElementById('navMenu');
    menu.classList.toggle('show');
}

// ==========================================
// MAP INITIALIZATION - OPTIMIZED
// ==========================================
function openLocationModal() {
    openModal('mapModal');
    setTimeout(() => {
        initializeMap();
    }, 100);
}

function initializeMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // Clean up existing map
    if (window._kabsueats_map) {
        try {
            window._kabsueats_map.remove();
        } catch (err) {}
    }

    const cvsuLat = 14.412768;
    const cvsuLng = 120.981348;
    const RADIUS = 500;

    // Get current location from hidden fields
    const prevLat = parseFloat(document.getElementById('previous_lat').value) || cvsuLat;
    const prevLng = parseFloat(document.getElementById('previous_lng').value) || cvsuLng;

    // Map layers
    const hybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '© Google',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '© Google',
        maxZoom: 21
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 22
    });

    const baseMaps = {
        "🗺️ Hybrid (Best View)": hybridLayer,
        "🛰️ Satellite": satelliteLayer,
        "🗺️ Street Map": streetLayer
    };

    // Initialize map
    const map = L.map('map', {
        layers: [hybridLayer],
        maxZoom: 22,
        minZoom: 15,
        zoomControl: true
    }).setView([prevLat, prevLng], 18);

    window._kabsueats_map = map;

    // Add layer control
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

    // Add CvSU marker
    const cvsuIcon = L.divIcon({
        html: '<div style="background: #f02849; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏫</div>',
        className: 'cvsu-marker',
        iconSize: [36, 36]
    });

    L.marker([cvsuLat, cvsuLng], { icon: cvsuIcon })
        .addTo(map)
        .bindPopup('<div style="text-align: center; font-weight: bold; padding: 8px;">🎓 CvSU-Bacoor<br><small>500m Radius Center</small></div>')
        .openPopup();

    // Add restriction circle
    L.circle([cvsuLat, cvsuLng], {
        color: '#f02849',
        fillColor: '#f02849',
        fillOpacity: 0.15,
        weight: 3,
        radius: RADIUS,
        dashArray: '10, 10'
    }).addTo(map);

    // Add establishment marker
    const establishmentIcon = L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; font-size: 20px; border: 3px solid white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);"><span style="transform: rotate(45deg);">📍</span></div>',
        className: 'establishment-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });

    const marker = L.marker([prevLat, prevLng], {
        draggable: true,
        icon: establishmentIcon
    }).addTo(map);

    window._kabsueats_marker = marker;

    // Reverse geocoding
    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: { 'User-Agent': 'KabsuEats/1.0' }
                }
            );
            const data = await response.json();
            return data?.display_name || `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        } catch (error) {
            console.error('Geocoding error:', error);
            return `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    }

    // Validate position
    async function validatePosition(latlng) {
        const distance = map.distance(latlng, [cvsuLat, cvsuLng]);

        document.getElementById('id_latitude').value = latlng.lat.toFixed(6);
        document.getElementById('id_longitude').value = latlng.lng.toFixed(6);

        const displayEl = document.getElementById('currentLocationDisplay');

        if (distance <= RADIUS) {
            displayEl.innerHTML = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
            displayEl.style.color = 'white';
            displayEl.parentElement.parentElement.parentElement.style.background = 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)';

            const addressDisplay = document.getElementById('geocodedAddressDisplay');
            const addressText = document.getElementById('geocodedAddressText');

            if (addressDisplay && addressText) {
                addressDisplay.style.display = 'block';
                addressText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting address...';

                const address = await reverseGeocode(latlng.lat, latlng.lng);
                currentGeocodedAddress = address;
                addressText.innerHTML = address;
            }

            return true;
        } else {
            displayEl.innerHTML = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)} ⚠️ OUTSIDE RADIUS`;
            displayEl.style.color = 'white';
            displayEl.parentElement.parentElement.parentElement.style.background = 'linear-gradient(135deg, #f44336 0%, #c62828 100%)';

            document.getElementById('geocodedAddressDisplay').style.display = 'none';
            currentGeocodedAddress = '';

            showNotification('⚠️ Please pin inside the red circle (within 500m of CvSU-Bacoor)', 'warning');

            return false;
        }
    }

    // Marker drag event
    marker.on('dragend', async function(e) {
        const position = marker.getLatLng();
        if (!await validatePosition(position)) {
            marker.setLatLng([prevLat, prevLng]);
        }
    });

    // Map click event
    map.on('click', async function(e) {
        if (await validatePosition(e.latlng)) {
            marker.setLatLng(e.latlng);
        }
    });

    // Load initial address
    if (prevLat && prevLng) {
        validatePosition({ lat: prevLat, lng: prevLng });
    }

    mapInitialized = true;
}

function resetToCvSU() {
    if (window._kabsueats_map && window._kabsueats_marker) {
        const cvsuLat = 14.412768;
        const cvsuLng = 120.981348;

        window._kabsueats_map.setView([cvsuLat, cvsuLng], 18);
        window._kabsueats_marker.setLatLng([cvsuLat, cvsuLng]);

        document.getElementById('id_latitude').value = cvsuLat.toFixed(6);
        document.getElementById('id_longitude').value = cvsuLng.toFixed(6);

        const displayEl = document.getElementById('currentLocationDisplay');
        displayEl.innerHTML = `${cvsuLat.toFixed(6)}, ${cvsuLng.toFixed(6)}`;
        displayEl.style.color = 'white';
        displayEl.parentElement.parentElement.parentElement.style.background = 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)';

        document.getElementById('geocodedAddressDisplay').style.display = 'none';
        currentGeocodedAddress = '';

        showNotification('✅ Location reset to CvSU-Bacoor Campus', 'success');
    }
}

function confirmMapLocation() {
    if (!currentGeocodedAddress) {
        showNotification('⚠️ Please pin a location on the map first', 'warning');
        return;
    }

    const lat = document.getElementById('id_latitude').value;
    const lng = document.getElementById('id_longitude').value;

    if (!lat || !lng) {
        showNotification('⚠️ Please pin a location on the map first', 'warning');
        return;
    }

    const addressField = document.getElementById('id_address');
    if (addressField) {
        addressField.value = currentGeocodedAddress;
    }

    closeModal('mapModal');
    showNotification('✅ Location and address updated successfully!', 'success');
}

// ==========================================
// EVENT LISTENERS
// ==========================================
document.addEventListener('click', function(e) {
    const dropdown = document.querySelector('.navbar-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        const navMenu = document.getElementById('navMenu');
        if (navMenu) {
            navMenu.classList.remove('show');
        }
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            closeModal(openModal.id);
        }

        const notificationPanel = document.getElementById('notificationPanel');
        if (notificationPanel && notificationPanel.classList.contains('open')) {
            toggleNotificationPanel();
        }

        const chatPanel = document.getElementById('chatPanel');
        if (chatPanel && chatPanel.classList.contains('open')) {
            toggleChatPanel();
        }
    }
});

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard initializing...');

    // Poll for notifications every 10 seconds (faster real-time feel)
    setInterval(pollNotifications, 10000);
    pollNotifications(); // Initial poll

    setupAddMenuItemForm();
    setupUpdateStoreDetailsForm();
    setupEditMenuItemForm();

    // Setup modal click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Check for login success message
    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get('login_success');

    if (loginSuccess === 'true') {
        showNotification('✅ Successfully logged in! Welcome to your dashboard.', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    updateStoreStats();

    // Update stats whenever menu changes
    const observer = new MutationObserver(updateStoreStats);
    const menuGrid = document.querySelector('.menu-grid');
    if (menuGrid) {
        observer.observe(menuGrid, { childList: true, subtree: true });
    }
});

// ==========================================
// CSS ANIMATIONS
// ==========================================
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.9);
        }
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==========================================
// SCROLL TO TOP FUNCTIONALITY
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const scrollBtn = document.getElementById('scrollToTopBtn');

    if (scrollBtn) {
        window.addEventListener('scroll', function(e) {
            const target = e.target;
            const scrollPosition = (target === document) ? window.scrollY : target.scrollTop;

            if (target !== document && target.scrollHeight < 500) return;

            if (scrollPosition > 300) {
                scrollBtn.classList.add('show');
            } else {
                scrollBtn.classList.remove('show');
            }
        }, true);

        scrollBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });

            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.scrollTop > 0) {
                    el.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }
});

function updateStoreStats() {
    const bestSellerBadges = document.querySelectorAll('.badge.bestseller');
    const bestSellerCount = bestSellerBadges.length;

    const availableBadges = document.querySelectorAll('.badge.available');
    const availableCount = availableBadges.length;

    animateCount('bestSellerCount', bestSellerCount);
    animateCount('availableCount', availableCount);
}

function animateCount(elementId, targetCount) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const currentCount = parseInt(element.textContent) || 0;
    const duration = 500;
    const steps = 20;
    const increment = (targetCount - currentCount) / steps;
    let current = currentCount;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        current += increment;

        if (step >= steps) {
            element.textContent = targetCount;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, duration / steps);
}

window.addEventListener('menuUpdated', updateStoreStats);