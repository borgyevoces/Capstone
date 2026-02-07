// ==========================================
// FOOD ESTABLISHMENT DASHBOARD JS - COMPLETE FIXED VERSION
// ==========================================

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let isSubmitting = false;
let mapInitialized = false;
let currentGeocodedAddress = '';

// ==========================================
// ✅ ADDED: CHAT PANEL TOGGLE FUNCTION (MISSING FUNCTION)
// ==========================================
function toggleChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    const chatWindow = document.getElementById('chatWindow');
    const chatToggleBtn = document.getElementById('chatToggleBtn');

    if (!chatPanel) {
        console.error('Chat panel not found');
        return;
    }

    // Toggle the 'open' class to show/hide the chat panel
    if (chatPanel.classList.contains('open')) {
        chatPanel.classList.remove('open');
        if (chatToggleBtn) {
            chatToggleBtn.classList.remove('active');
        }
    } else {
        chatPanel.classList.add('open');
        if (chatToggleBtn) {
            chatToggleBtn.classList.add('active');
        }

        // Load conversations when opening
        loadConversations();
    }

    // Hide chat window if open
    if (chatWindow && chatWindow.style.display === 'flex') {
        chatWindow.style.display = 'none';
    }
}

// ==========================================
// ✅ ADDED: BACK TO CONVERSATIONS FUNCTION
// ==========================================
function backToConversations() {
    const chatWindow = document.getElementById('chatWindow');
    const chatPanel = document.getElementById('chatPanel');

    if (chatWindow) {
        chatWindow.style.display = 'none';
    }

    if (chatPanel) {
        chatPanel.classList.add('open');
    }
}

// ==========================================
// ✅ ADDED: LOAD CONVERSATIONS FUNCTION
// ==========================================
function loadConversations() {
    const conversationsList = document.getElementById('conversationsList');

    if (!conversationsList) {
        console.error('Conversations list not found');
        return;
    }

    // Show loading state
    conversationsList.innerHTML = `
        <div class="chat-empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading conversations...</p>
        </div>
    `;

    // Fetch conversations from the server
    fetch('/api/food-establishment/conversations/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.conversations && data.conversations.length > 0) {
            conversationsList.innerHTML = data.conversations.map(conv => `
                <div class="conversation-item" onclick="openConversation(${conv.customer_id}, '${escapeHtml(conv.customer_name)}')">
                    <div class="conversation-avatar">
                        ${conv.customer_name ? conv.customer_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-name">${escapeHtml(conv.customer_name || 'Customer')}</div>
                        <div class="conversation-preview">${escapeHtml(conv.last_message || 'No messages yet')}</div>
                    </div>
                    ${conv.unread_count > 0 ? `<span class="conversation-badge">${conv.unread_count}</span>` : ''}
                </div>
            `).join('');
        } else {
            conversationsList.innerHTML = `
                <div class="chat-empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No conversations yet</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error loading conversations:', error);
        conversationsList.innerHTML = `
            <div class="chat-empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load conversations</p>
            </div>
        `;
    });
}

// ==========================================
// ✅ ADDED: OPEN CONVERSATION FUNCTION
// ==========================================
function openConversation(customerId, customerName) {
    const chatWindow = document.getElementById('chatWindow');
    const chatPanel = document.getElementById('chatPanel');
    const chatWindowName = document.getElementById('chatWindowName');
    const chatWindowAvatar = document.getElementById('chatWindowAvatar');

    if (!chatWindow) {
        console.error('Chat window not found');
        return;
    }

    // Update header
    if (chatWindowName) {
        chatWindowName.textContent = customerName || 'Customer';
    }

    if (chatWindowAvatar) {
        chatWindowAvatar.textContent = customerName ? customerName.charAt(0).toUpperCase() : 'U';
    }

    // Hide chat panel and show chat window
    if (chatPanel) {
        chatPanel.classList.remove('open');
    }

    chatWindow.style.display = 'flex';

    // Store current customer ID for sending messages
    window.currentCustomerId = customerId;

    // Load messages for this conversation
    loadMessages(customerId);
}

// ==========================================
// ✅ ADDED: LOAD MESSAGES FUNCTION
// ==========================================
function loadMessages(customerId) {
    const messagesContainer = document.getElementById('chatMessagesContainer');

    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }

    // Show loading state
    messagesContainer.innerHTML = `
        <div class="chat-empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading messages...</p>
        </div>
    `;

    // Fetch messages from the server
    fetch(`/api/food-establishment/messages/${customerId}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.messages && data.messages.length > 0) {
            messagesContainer.innerHTML = data.messages.map(msg => `
                <div class="chat-message ${msg.is_from_owner ? 'sent' : 'received'}" data-message-id="${msg.id}">
                    <div class="chat-message-bubble">
                        ${escapeHtml(msg.content)}
                        <div class="chat-message-time">${formatMessageTime(msg.created_at)}</div>
                    </div>
                    <button class="message-options-btn" onclick="showMessageOptions(${msg.id}, event)">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            `).join('');

            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            messagesContainer.innerHTML = `
                <div class="chat-empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = `
            <div class="chat-empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load messages</p>
            </div>
        `;
    });
}

// ==========================================
// ✅ ADDED: SEND MESSAGE FUNCTION
// ==========================================
function sendMessage(event) {
    event.preventDefault();

    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (!message) {
        return;
    }

    if (!window.currentCustomerId) {
        showNotification('Please select a conversation first', 'error');
        return;
    }

    // Send message to server
    fetch('/api/food-establishment/send-message/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            customer_id: window.currentCustomerId,
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear input
            chatInput.value = '';

            // Reload messages to show the new one
            loadMessages(window.currentCustomerId);
        } else {
            showNotification(data.message || 'Failed to send message', 'error');
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    });
}

// ==========================================
// ✅ ADDED: FORMAT MESSAGE TIME
// ==========================================
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }

    // More than 24 hours - show time
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ==========================================
// ✅ ADDED: SHOW MESSAGE OPTIONS (PLACEHOLDER)
// ==========================================
function showMessageOptions(messageId, event) {
    event.stopPropagation();
    console.log('Show options for message:', messageId);
    // Add your message options menu functionality here
}

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

// ==========================================
// CSRF TOKEN HELPER
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

function setupAddMenuItemForm() {
    const addMenuForm = document.getElementById('addMenuItemForm');

    if (!addMenuForm) {
        console.log('⚠️ Add menu form not found');
        return;
    }

    // Remove any existing event listeners by cloning
    const newForm = addMenuForm.cloneNode(true);
    addMenuForm.parentNode.replaceChild(newForm, addMenuForm);

    console.log('✅ Setting up add menu form handler');

    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('📝 Form submit triggered');

        // Prevent double submission
        if (isSubmitting) {
            console.log('⏳ Already submitting, ignoring...');
            showNotification('⏳ Please wait, submission in progress...', 'info');
            return false;
        }

        const formData = new FormData(this);
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        // Validate required fields
        const name = formData.get('name');
        const price = formData.get('price');
        const description = formData.get('description');

        if (!name || !price || !description) {
            showNotification('❌ Please fill in all required fields', 'error');
            return false;
        }

        // Get CSRF token
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            showNotification('❌ Security token missing. Please refresh the page.', 'error');
            return false;
        }

        console.log('🚀 Submitting menu item:', name);

        // Set flag
        isSubmitting = true;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

        fetch(window.location.href, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return response.text().then(text => {
                    console.error('❌ Server returned HTML:', text.substring(0, 500));
                    throw new Error('Server error - check server logs');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('📦 Response received:', data);

            if (data.success) {
                if (data.skipped) {
                    console.log('⚠️ Duplicate request detected, skipping');
                    return;
                }

                showNotification('✅ ' + data.message, 'success');

                // Add item to grid
                if (data.item) {
                    const existingItem = document.querySelector(`.menu-card[data-item-id="${data.item.id}"]`);
                    if (!existingItem) {
                        console.log('➕ Adding new item to grid');
                        addMenuItemToGrid(data.item);
                    } else {
                        console.log('⚠️ Item already exists in grid');
                    }
                }

                // ✅ CRITICAL: Reset form and keep modal open
                newForm.reset();

                // ✅ Update token for next submission
                const tokenInput = newForm.querySelector('input[name="menu_add_token"]');
                if (tokenInput && data.new_menu_token) {
                    tokenInput.value = data.new_menu_token;
                    console.log('🔑 Token updated for next submission');
                }

                // ✅ Re-enable button immediately
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                isSubmitting = false;

                // ✅ Focus on name field for quick next entry
                const nameInput = newForm.querySelector('input[name="name"]');
                if (nameInput) {
                    setTimeout(() => nameInput.focus(), 100);
                }

                console.log('✅ Ready for next item');

            } else {
                showNotification('❌ ' + (data.error || 'Failed to add menu item'), 'error');
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                isSubmitting = false;
            }
        })
        .catch(error => {
            console.error('❌ Error:', error);
            showNotification('❌ ' + error.message, 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            isSubmitting = false;
        });

        return false;
    });

    console.log('✅ Add menu form handler attached successfully');
}

// ==========================================
// ADD MENU ITEM TO GRID (REAL-TIME)
// ==========================================
function addMenuItemToGrid(item) {
    console.log('➕ Adding item to grid:', item.id);

    const menuGrid = document.querySelector('.menu-grid');
    const noItems = document.querySelector('.no-items');

    if (noItems) {
        noItems.remove();
    }

    // Check if item already exists (prevent duplicates)
    const existingItem = document.querySelector(`.menu-card[data-item-id="${item.id}"]`);
    if (existingItem) {
        console.log('⚠️ Item already exists, skipping add');
        return;
    }

    const menuCard = document.createElement('div');
    menuCard.className = 'menu-card';
    menuCard.dataset.itemId = item.id;
    menuCard.dataset.itemName = item.name;
    menuCard.dataset.itemDescription = item.description;
    menuCard.dataset.itemPrice = item.price;
    menuCard.dataset.itemQuantity = item.quantity || 0;
    menuCard.dataset.itemImageUrl = item.image_url || '';

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
                <button class="action-btn edit" onclick="openEditModal('${item.id}')">
                    <i class="fas fa-pen"></i> Edit
                </button>
                <form action="/owner/dashboard/toggle_top_seller/${item.id}/" method="post" style="display: contents;">
                    <input type="hidden" name="csrfmiddlewaretoken" value="${getCookie('csrftoken')}">
                    <button type="submit" class="action-btn seller">
                        <i class="fas fa-award"></i> ${item.is_top_seller ? 'Unmark' : 'Mark'}
                    </button>
                </form>
                <button type="button" class="action-btn delete" onclick="deleteMenuItem('${item.id}', this)">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;

    menuCard.style.animation = 'fadeInUp 0.5s ease';

    if (!menuGrid) {
        const menuSection = document.querySelector('.menu-section');
        const newGrid = document.createElement('div');
        newGrid.className = 'menu-grid';
        newGrid.appendChild(menuCard);
        menuSection.appendChild(newGrid);
    } else {
        menuGrid.appendChild(menuCard);
    }

    console.log('✅ Item added to grid successfully');
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
// NOTIFICATION PANEL
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
// ✅ ENHANCED: Render notification with complete order details
function renderNotification(notif) {
    const isUnread = notif.is_new ? 'unread' : '';
    const statusClass = notif.order.status.toLowerCase();
    const customerInitial = notif.customer.name.charAt(0).toUpperCase();

    // Format order items
    const orderItemsHTML = notif.order.items.map(item => `
        <div class="order-item-row">
            <div class="item-name-qty">
                <strong>${item.name}</strong> x${item.quantity}
            </div>
            <div class="item-price">₱${item.total.toFixed(2)}</div>
        </div>
    `).join('');

    return `
        <div class="notification-item ${isUnread}" onclick="markNotificationRead(${notif.id})" data-notification-id="${notif.id}">
            <div class="notification-header">
                <div class="notification-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">
                        <span>New Order #${notif.order.id}</span>
                        <span class="notification-type-badge ${notif.type}">NEW ORDER</span>
                    </div>
                    <div class="notification-message">${notif.message}</div>
                </div>
            </div>

            <!-- Customer Information -->
            <div class="customer-info">
                <div class="customer-avatar">${customerInitial}</div>
                <div class="customer-details">
                    <div class="customer-name">${notif.customer.name}</div>
                    <div class="customer-email">${notif.customer.email}</div>
                </div>
            </div>

            <!-- Order Summary -->
            <div class="order-summary">
                <div class="order-summary-header">
                    <span class="order-id">Order #${notif.order.id}</span>
                    <span class="order-total">₱${notif.order.total_amount.toFixed(2)}</span>
                </div>

                ${notif.order.reference_number !== 'N/A' ? `
                    <div class="order-reference">
                        <i class="fas fa-hashtag"></i> Ref: ${notif.order.reference_number}
                    </div>
                ` : ''}

                <div class="order-items-list">
                    ${orderItemsHTML}
                </div>

                <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <span class="order-status-badge ${statusClass}">
                        <i class="fas fa-${notif.is_paid ? 'check-circle' : 'clock'}"></i>
                        ${notif.order.status}
                    </span>
                    <span style="font-size: 12px; color: #6b7280;">
                        ${notif.order.item_count} item${notif.order.item_count > 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <!-- Timestamps -->
            <div class="notification-time">
                <i class="far fa-clock"></i>
                <span class="time-ago">${notif.time_ago}</span>
                <span style="margin-left: auto; font-size: 11px;">
                    ${notif.created_at}
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

function pollNotifications() {
    if (!document.getElementById('notificationPanel').classList.contains('open')) {
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
                updateNotificationBadge(data.unread_count);

                // Show toast notification if new orders
                if (data.unread_count > 0) {
                    const latestNotif = data.notifications[0];
                    if (latestNotif && latestNotif.is_new) {
                        showToastNotification(latestNotif);
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error polling notifications:', error);
        });
    }
}
// ✅ Show toast notification for new orders
function showToastNotification(notif) {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-shopping-cart"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">New Order #${notif.order.id}</div>
            <div class="toast-message">${notif.customer.name} • ₱${notif.order.total_amount.toFixed(2)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 300ms ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}
function getNotificationIcon(type) {
    const icons = {
        'new_order': 'shopping-cart',
        'payment_confirmed': 'check-circle',
        'order_cancelled': 'times-circle',
        'review': 'star',
        'message': 'envelope',
        'alert': 'exclamation-circle'
    };
    return icons[type] || 'bell';
}
function getNotificationTitle(type) {
    const titles = {
        'new_order': 'New Order Received',
        'payment_confirmed': 'Payment Confirmed',
        'order_cancelled': 'Order Cancelled',
        'review': 'New Review',
        'message': 'New Message',
        'alert': 'Alert'
    };
    return titles[type] || 'Notification';
}
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'block';
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
            loadNotifications();
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
        }
    })
    .catch(error => {
        console.error('Error marking all notifications as read:', error);
    });
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
    setInterval(pollNotifications, 30000);
    // Check for login success message
    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get('login_success');

    if (loginSuccess === 'true') {
        showNotification('✅ Successfully logged in! Welcome to your dashboard.', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load notifications
    loadNotifications();

    // Poll for new notifications every 60 seconds
    setInterval(pollNotifications, 60000);

    // Setup form handlers
    setupUpdateStoreDetailsForm();
    setupAddMenuItemForm();
    setupEditMenuItemForm();

    // Setup modal click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    console.log('✅ Dashboard initialized successfully');
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
`;
document.head.appendChild(style);
// ==========================================
// SCROLL TO TOP FUNCTIONALITY (UNIVERSAL FIX)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const scrollBtn = document.getElementById('scrollToTopBtn');

    if (scrollBtn) {
        // 1. Universal Scroll Detector (Detects window OR div scrolling)
        window.addEventListener('scroll', function(e) {
            // Determine if the scroll is coming from the window or a specific element
            const target = e.target;
            const scrollPosition = (target === document) ? window.scrollY : target.scrollTop;

            // Ignore small scrolling boxes (like dropdowns)
            // Only trigger for the main page or large containers
            if (target !== document && target.scrollHeight < 500) return;

            // Show button if scrolled more than 300px
            if (scrollPosition > 300) {
                scrollBtn.classList.add('show');
            } else {
                scrollBtn.classList.remove('show');
            }
        }, true); // <--- 'true' captures scroll events inside divs!

        // 2. Universal Scroll To Top Action
        scrollBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // Method A: Scroll Window
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Method B: Scroll any open container (Fix for dashboards)
            // This finds whatever element is currently scrolled down and pushes it up
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.scrollTop > 0) {
                    el.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });

        console.log("✅ Scroll Button Loaded");
    } else {
        console.error("❌ Scroll Button Element NOT found. Check your HTML placement.");
    }
});
document.addEventListener('DOMContentLoaded', function() {
    updateStoreStats();

    // Update stats whenever menu changes
    const observer = new MutationObserver(updateStoreStats);
    const menuGrid = document.querySelector('.menu-grid');
    if (menuGrid) {
        observer.observe(menuGrid, { childList: true, subtree: true });
    }
});

function updateStoreStats() {
    // Count Best Sellers (items with "Best Seller" badge)
    const bestSellerBadges = document.querySelectorAll('.badge.bestseller');
    const bestSellerCount = bestSellerBadges.length;

    // Count Available Items (items with quantity > 0)
    const availableBadges = document.querySelectorAll('.badge.available');
    const availableCount = availableBadges.length;

    // Update display with animation
    animateCount('bestSellerCount', bestSellerCount);
    animateCount('availableCount', availableCount);

    console.log(`âœ… Stats Updated: ${bestSellerCount} Best Sellers, ${availableCount} Available`);
}

function animateCount(elementId, targetCount) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const currentCount = parseInt(element.textContent) || 0;
    const duration = 500; // milliseconds
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

// âœ… Auto-update when menu items are added/edited/deleted
window.addEventListener('menuUpdated', updateStoreStats);
// ==========================================
// DELETE ESTABLISHMENT FUNCTIONALITY
// ==========================================
function showDeleteConfirmation(event) {
    event.preventDefault();
    const modal = document.getElementById('deleteModal');
    modal.classList.add('active');
    // Close the dropdown menu
    const navMenu = document.getElementById('navMenu');
    if (navMenu) {
        navMenu.classList.remove('show');
    }
}

function hideDeleteConfirmation() {
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('active');
}

function confirmDeleteEstablishment() {
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    // Disable button to prevent double clicks
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

    // Get CSRF token
    const csrfToken = getCookie('csrftoken');

    // Make the delete request
    fetch('/owner/delete-establishment/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            showNotification(data.message, 'success');

            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = data.redirect_url;
            }, 1500);
        } else {
            // Show error message
            showNotification(data.error || 'Failed to delete establishment', 'error');

            // Re-enable button
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Yes, Delete';

            // Hide modal
            hideDeleteConfirmation();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An unexpected error occurred. Please try again.', 'error');

        // Re-enable button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Yes, Delete';

        // Hide modal
        hideDeleteConfirmation();
    });
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                hideDeleteConfirmation();
            }
        });
    }
});


// ==========================================
// NEW FEATURES - ORDERS TABLE, TRANSACTION HISTORY, SALES REPORT
// ==========================================

// Global variables for new features
let currentPage = 1;
let totalPages = 1;
let salesChart = null;

// ==========================================
// LOAD ORDERS TABLE (FOR FOOD SHOPS)
// ==========================================
// ==========================================
// SALES REPORT MODAL
// ==========================================
function openSalesReportModal() {
    const modal = document.getElementById('salesReportModal');
    if (modal) {
        modal.classList.add('active');
        loadSalesReport();
    }
}

function closeSalesReportModal() {
    const modal = document.getElementById('salesReportModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function loadSalesReport() {
    const period = document.getElementById('reportPeriod')?.value || 'week';
    let url = `/api/food-establishment/sales-report/?period=${period}`;

    if (period === 'custom') {
        const startDate = document.getElementById('reportStartDate')?.value;
        const endDate = document.getElementById('reportEndDate')?.value;
        if (startDate && endDate) {
            url += `&start_date=${startDate}&end_date=${endDate}`;
        }
    }

    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateSalesReportUI(data.report);
        } else {
            showNotification(data.message || 'Failed to load sales report', 'error');
        }
    })
    .catch(error => {
        console.error('Error loading sales report:', error);
        showNotification('Failed to load sales report', 'error');
    });
}

function updateSalesReportUI(report) {
    // Update summary cards
    const revenueEl = document.getElementById('totalRevenue');
    const ordersEl = document.getElementById('totalOrders');
    const averageEl = document.getElementById('averageOrder');
    const itemsEl = document.getElementById('itemsSold');

    if (revenueEl) revenueEl.textContent = `₱${parseFloat(report.total_revenue).toFixed(2)}`;
    if (ordersEl) ordersEl.textContent = report.total_orders;
    if (averageEl) averageEl.textContent = `₱${parseFloat(report.average_order).toFixed(2)}`;
    if (itemsEl) itemsEl.textContent = report.items_sold;

    // Update chart
    if (report.daily_sales) {
        updateSalesChart(report.daily_sales);
    }

    // Update top selling items
    if (report.top_items) {
        updateTopSellingItems(report.top_items);
    }
}

function updateSalesChart(dailySales) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailySales.map(d => d.date),
            datasets: [{
                label: 'Sales (₱)',
                data: dailySales.map(d => d.amount),
                borderColor: '#f02849',
                backgroundColor: 'rgba(240, 40, 73, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function updateTopSellingItems(items) {
    const container = document.getElementById('topSellingItems');

    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">No items sold in this period</p>';
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <div style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #f02849 0%, #c62828 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; margin-right: 12px;">
                ${index + 1}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #1a1a1a;">${escapeHtml(item.name)}</div>
                <div style="font-size: 12px; color: #6b7280;">${item.quantity} sold</div>
            </div>
            <div style="font-weight: 800; color: #B71C1C; font-size: 16px;">
                ₱${parseFloat(item.total_revenue).toFixed(2)}
            </div>
        </div>
    `).join('');
}

function applyReportFilters() {
    loadSalesReport();
}

function updateSalesReport() {
    const period = document.getElementById('reportPeriod')?.value;
    const customRangeGroup = document.getElementById('customDateRangeGroup');
    const customRangeGroup2 = document.getElementById('customDateRangeGroup2');

    if (period === 'custom') {
        if (customRangeGroup) customRangeGroup.style.display = 'flex';
        if (customRangeGroup2) customRangeGroup2.style.display = 'flex';
    } else {
        if (customRangeGroup) customRangeGroup.style.display = 'none';
        if (customRangeGroup2) customRangeGroup2.style.display = 'none';
        loadSalesReport();
    }
}

function exportSalesReportPDF() {
    const period = document.getElementById('reportPeriod')?.value || 'week';
    window.open(`/api/food-establishment/sales-report/pdf/?period=${period}`, '_blank');
    showNotification('Generating PDF report...', 'info');
}

function exportSalesReportExcel() {
    const period = document.getElementById('reportPeriod')?.value || 'week';
    window.location.href = `/api/food-establishment/sales-report/excel/?period=${period}`;
    showNotification('Downloading Excel report...', 'success');
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// INITIALIZATION FOR NEW FEATURES
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Close modal when clicking outside
    const salesModal = document.getElementById('salesReportModal');
    if (salesModal) {
        salesModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeSalesReportModal();
            }
        });
    }
});
// ==========================================
// ULTRA SIMPLE ACCORDION NOTIFICATION SYSTEM
// ==========================================

// Override renderNotification for accordion style
window.renderNotificationOriginal = window.renderNotification;

window.renderNotification = function(notif) {
    const isUnread = notif.is_new ? 'unread' : '';
    const customerInitial = notif.customer.name ? notif.customer.name.charAt(0).toUpperCase() : 'U';
    const customerEmail = notif.customer.email || 'customer@email.com';
    const orderId = notif.order.id || 'N/A';
    const statusClass = notif.order.status ? notif.order.status.toLowerCase() : 'pending';

    // Format order items
    const orderItemsHTML = notif.order.items ? notif.order.items.map(item => `
        <div class="notif-item">
            <span class="notif-item-name">
                <strong>${item.quantity}x</strong> ${escapeHtmlText(item.name)}
            </span>
            <span class="notif-item-price">₱${parseFloat(item.total).toFixed(2)}</span>
        </div>
    `).join('') : '';

    return `
        <div class="notification-item ${isUnread}" data-notification-id="${notif.id}">

            <!-- ONE LINE HEADER - Email Only -->
            <div class="notif-header" onclick="toggleAccordion('${notif.id}')">
                <span class="notif-email">${escapeHtmlText(customerEmail)}</span>
                <div class="notif-toggle">
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>

            <!-- EXPANDABLE BODY - All Details -->
            <div class="notif-body">
                <div class="notif-content">

                    <!-- Message -->
                    ${notif.message ? `
                        <div class="notif-section">
                            <div class="notif-value">${escapeHtmlText(notif.message)}</div>
                        </div>
                    ` : ''}

                    <!-- Customer Info -->
                    <div class="notif-section">
                        <div class="notif-label">Customer</div>
                        <div class="notif-customer">
                            <div class="notif-avatar">${customerInitial}</div>
                            <div class="notif-customer-info">
                                <div class="notif-customer-name">${escapeHtmlText(notif.customer.name)}</div>
                                <div class="notif-customer-email">${escapeHtmlText(customerEmail)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Order Details -->
                    <div class="notif-section">
                        <div class="notif-label">Order Details</div>
                        <div class="notif-order">
                            <div class="notif-order-header">
                                <span class="notif-order-id">Order #${escapeHtmlText(orderId)}</span>
                                <span class="notif-order-total">₱${parseFloat(notif.order.total_amount).toFixed(2)}</span>
                            </div>

                            ${notif.order.reference_number && notif.order.reference_number !== 'N/A' ? `
                                <div class="notif-order-ref">
                                    <i class="fas fa-hashtag"></i>
                                    Ref: ${escapeHtmlText(notif.order.reference_number)}
                                </div>
                            ` : ''}

                            ${orderItemsHTML ? `
                                <div class="notif-items">
                                    ${orderItemsHTML}
                                </div>
                            ` : ''}

                            <div class="notif-status ${statusClass}">
                                <i class="fas fa-${notif.is_paid ? 'check-circle' : 'clock'}"></i>
                                ${escapeHtmlText(notif.order.status || 'Pending')}
                            </div>
                        </div>
                    </div>

                    <!-- Delivery Address -->
                    ${notif.order.delivery_address ? `
                        <div class="notif-section">
                            <div class="notif-label">Delivery Address</div>
                            <div class="notif-delivery">
                                <i class="fas fa-map-marker-alt"></i>
                                ${escapeHtmlText(notif.order.delivery_address)}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Time -->
                    <div class="notif-time">
                        <i class="far fa-clock"></i>
                        ${notif.time_ago}
                    </div>

                    <!-- Action Buttons -->
                    <div class="notif-actions">
                        <button class="notif-btn notif-btn-primary" onclick="event.stopPropagation(); viewOrder('${notif.order.id}')">
                            <i class="fas fa-eye"></i>
                            View Order
                        </button>
                        <button class="notif-btn notif-btn-secondary" onclick="event.stopPropagation(); dismissNotif('${notif.id}')">
                            <i class="fas fa-times"></i>
                            Dismiss
                        </button>
                    </div>

                </div>
            </div>
        </div>
    `;
};

// Toggle accordion expansion
function toggleAccordion(notificationId) {
    const item = document.querySelector(`[data-notification-id="${notificationId}"]`);

    if (!item) return;

    const isExpanded = item.classList.contains('expanded');

    // Close all other notifications
    document.querySelectorAll('.notification-item.expanded').forEach(otherItem => {
        if (otherItem.dataset.notificationId !== notificationId) {
            otherItem.classList.remove('expanded');
        }
    });

    // Toggle current notification
    if (isExpanded) {
        item.classList.remove('expanded');
    } else {
        item.classList.add('expanded');

        // Mark as read when expanded
        if (item.classList.contains('unread')) {
            markNotificationRead(notificationId);
            item.classList.remove('unread');
        }
    }
}

// View order details
function viewOrder(orderId) {
    window.location.href = `/orders/${orderId}/`;
}

// Dismiss notification
function dismissNotif(notificationId) {
    const item = document.querySelector(`[data-notification-id="${notificationId}"]`);

    if (!item) return;

    // Animate out
    item.style.animation = 'slideOut 0.3s ease';

    setTimeout(() => {
        item.remove();

        // Check if empty
        const list = document.getElementById('notificationList');
        if (list && list.children.length === 0) {
            list.innerHTML = `
                <div class="notification-empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications</p>
                </div>
            `;
        }

        // Update badge
        updateNotificationBadge(document.querySelectorAll('.notification-item.unread').length);
    }, 300);

    // Call API to dismiss
    fetch(`/api/notifications/${notificationId}/dismiss/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    }).catch(error => console.error('Error dismissing notification:', error));
}

// Helper function to escape HTML
function escapeHtmlText(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Mark notification as read
function markNotificationRead(notificationId) {
    fetch(`/api/notifications/${notificationId}/mark-read/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateNotificationBadge(data.unread_count || 0);
        }
    })
    .catch(error => console.error('Error marking as read:', error));
}