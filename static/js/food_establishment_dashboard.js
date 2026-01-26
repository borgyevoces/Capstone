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

// ==========================================
// ✅ FIXED: ADD MENU ITEM FORM HANDLER
// Continuous adding without refresh
// ==========================================
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

// ===== CUSTOMER RECORDS SYSTEM - REAL-TIME ORDER MANAGEMENT =====
// Configuration
const ESTABLISHMENT_ID = {{ establishment.id }};
const REFRESH_INTERVAL = 5000;
let currentPage = 1;
let itemsPerPage = 10;
let allOrders = [];
let autoRefreshInterval = null;

// DOM Elements
const customerRecordsBtn = document.getElementById('customerRecordsBtn');
const customerRecordsModal = document.getElementById('customerRecordsModal');
const recordsCloseBtn = document.getElementById('recordsCloseBtn');
const recordsTabs = document.querySelectorAll('.records-tab');
const recordsTabContents = document.querySelectorAll('.records-tab-content');

// Modal Functions
function openCustomerRecordsModal() {
    customerRecordsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadAllOrders();
    startAutoRefresh();
}

function closeCustomerRecordsModal() {
    customerRecordsModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    stopAutoRefresh();
}

function initializeCustomerRecords() {
    customerRecordsBtn.addEventListener('click', openCustomerRecordsModal);
    recordsCloseBtn.addEventListener('click', closeCustomerRecordsModal);

    customerRecordsModal.addEventListener('click', function(event) {
        if (event.target === customerRecordsModal) {
            closeCustomerRecordsModal();
        }
    });

    recordsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });

    document.getElementById('applyFiltersBtn')?.addEventListener('click', applyFilters);
    document.getElementById('customerSearchInput')?.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && customerRecordsModal.classList.contains('active')) {
            closeCustomerRecordsModal();
        }
    });
}

function switchTab(tabName) {
    recordsTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });

    recordsTabContents.forEach(content => {
        content.classList.remove('active');
    });

    const activeContent = document.getElementById(tabName + 'Tab');
    if (activeContent) {
        activeContent.classList.add('active');

        if (tabName === 'pending') {
            loadPendingOrders();
        } else if (tabName === 'paid') {
            loadPaidOrders();
        } else if (tabName === 'completed') {
            loadCompletedOrders();
        } else if (tabName === 'history') {
            loadTransactionHistory();
        }
    }
}

// Load Orders Data
function loadAllOrders() {
    console.log('📥 Loading all orders...');

    fetch(`/api/orders/establishment/${ESTABLISHMENT_ID}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('✅ Orders loaded:', data);
        allOrders = data.orders || [];
        updateRecordsBadge(data.pending_count || 0);
        displayAllOrders();
    })
    .catch(error => {
        console.error('❌ Error loading orders:', error);
        showErrorState('ordersEmptyState', 'Failed to load orders. Please try again.');
    });
}

function loadPendingOrders() {
    console.log('⏳ Loading pending orders...');

    fetch(`/api/orders/establishment/${ESTABLISHMENT_ID}/?status=PENDING`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Pending orders loaded:', data);
        displayPendingOrders(data.orders || []);
    })
    .catch(error => {
        console.error('❌ Error loading pending orders:', error);
        showErrorState('pendingEmptyState', 'Failed to load pending orders.');
    });
}

function loadPaidOrders() {
    console.log('💳 Loading paid orders...');

    fetch(`/api/orders/establishment/${ESTABLISHMENT_ID}/?status=PAID`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Paid orders loaded:', data);
        displayPaidOrders(data.orders || []);
    })
    .catch(error => {
        console.error('❌ Error loading paid orders:', error);
        showErrorState('paidEmptyState', 'Failed to load paid orders.');
    });
}

function loadCompletedOrders() {
    console.log('⭐ Loading completed orders...');

    fetch(`/api/orders/establishment/${ESTABLISHMENT_ID}/?status=COMPLETED`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Completed orders loaded:', data);
        displayCompletedOrders(data.orders || []);
    })
    .catch(error => {
        console.error('❌ Error loading completed orders:', error);
        showErrorState('completedEmptyState', 'Failed to load completed orders.');
    });
}

function loadTransactionHistory() {
    console.log('📊 Loading transaction history...');

    fetch(`/api/transactions/establishment/${ESTABLISHMENT_ID}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Transaction history loaded:', data);
        displayTransactionHistory(data.transactions || []);
    })
    .catch(error => {
        console.error('❌ Error loading transaction history:', error);
        showErrorState('historyEmptyState', 'Failed to load transaction history.');
    });
}

// Display Functions
function displayAllOrders() {
    const tbody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('ordersEmptyState');

    if (allOrders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    const sortedOrders = allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage);

    tbody.innerHTML = paginatedOrders.map(order => `
        <tr data-order-id="${order.id}">
            <td><strong>#${order.id}</strong></td>
            <td>${escapeHtml(order.customer_name)}</td>
            <td>${formatDate(order.created_at)}</td>
            <td><strong style="color: #B71C1C;">₱${parseFloat(order.total_amount).toFixed(2)}</strong></td>
            <td>${getPaymentStatusBadge(order.status)}</td>
            <td>${getOrderStatusBadge(order.order_status || order.status)}</td>
            <td>
                <button class="records-filter-btn" onclick="expandOrderDetails(${order.id})" style="font-size: 12px; padding: 6px 12px;">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');

    updatePagination(sortedOrders.length);
}

function displayPendingOrders(orders) {
    const tbody = document.getElementById('pendingTableBody');
    const emptyState = document.getElementById('pendingEmptyState');

    if (orders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = orders.map(order => `
        <tr data-order-id="${order.id}">
            <td><strong>#${order.id}</strong></td>
            <td>${escapeHtml(order.customer_name)}</td>
            <td>${formatDate(order.created_at)}</td>
            <td><strong style="color: #B71C1C;">₱${parseFloat(order.total_amount).toFixed(2)}</strong></td>
            <td><span class="status-badge status-pending">${getTimePending(order.created_at)}</span></td>
            <td>
                <button class="records-filter-btn" onclick="markOrderAsPaid(${order.id})" style="font-size: 12px; padding: 6px 12px;">
                    <i class="fas fa-check"></i> Mark Paid
                </button>
            </td>
        </tr>
    `).join('');
}

function displayPaidOrders(orders) {
    const tbody = document.getElementById('paidTableBody');
    const emptyState = document.getElementById('paidEmptyState');

    if (orders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = orders.map(order => `
        <tr data-order-id="${order.id}">
            <td><strong>#${order.id}</strong></td>
            <td>${escapeHtml(order.customer_name)}</td>
            <td>${formatDate(order.payment_confirmed_at || order.updated_at)}</td>
            <td><strong style="color: #10b981;">₱${parseFloat(order.total_amount).toFixed(2)}</strong></td>
            <td>${getOrderStatusBadge(order.order_status || order.status)}</td>
            <td>
                <button class="records-filter-btn" onclick="expandOrderDetails(${order.id})" style="font-size: 12px; padding: 6px 12px;">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

function displayCompletedOrders(orders) {
    const tbody = document.getElementById('completedTableBody');
    const emptyState = document.getElementById('completedEmptyState');

    if (orders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = orders.map(order => `
        <tr data-order-id="${order.id}">
            <td><strong>#${order.id}</strong></td>
            <td>${escapeHtml(order.customer_name)}</td>
            <td>${formatDate(order.updated_at)}</td>
            <td><strong style="color: #10b981;">₱${parseFloat(order.total_amount).toFixed(2)}</strong></td>
            <td>${getRatingDisplay(order.rating || 0)}</td>
            <td>
                <button class="records-filter-btn" onclick="expandOrderDetails(${order.id})" style="font-size: 12px; padding: 6px 12px;">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

function displayTransactionHistory(transactions) {
    const timeline = document.getElementById('transactionTimeline');
    const emptyState = document.getElementById('historyEmptyState');

    if (transactions.length === 0) {
        timeline.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    timeline.innerHTML = transactions.map(transaction => {
        const isCompleted = transaction.status === 'COMPLETED' || transaction.status === 'PAID';
        return `
            <div class="transaction-item ${isCompleted ? 'completed' : 'pending'}">
                <div class="transaction-date">${formatDate(transaction.created_at)}</div>
                <div class="transaction-description">
                    <strong>Order #${transaction.order_id}</strong> - ${transaction.description}
                </div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 8px;">
                    Customer: ${escapeHtml(transaction.customer_name)}
                </div>
                <div class="transaction-amount">₱${parseFloat(transaction.amount).toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

function expandOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        alert('Order not found');
        return;
    }

    const detailsContainer = document.getElementById('orderDetailsContainer');
    const itemsHTML = order.items.map(item => `
        <div class="order-item">
            <div>
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-quantity">Qty: ${item.quantity}</div>
            </div>
            <div class="item-price">₱${parseFloat(item.price).toFixed(2)}</div>
        </div>
    `).join('');

    const detailsHTML = `
        <div class="order-details-card">
            <div class="order-detail-item">
                <div class="order-detail-label">Order ID</div>
                <div class="order-detail-value">#${order.id}</div>
            </div>
            <div class="order-detail-item">
                <div class="order-detail-label">Customer</div>
                <div class="order-detail-value">${escapeHtml(order.customer_name)}</div>
            </div>
            <div class="order-detail-item">
                <div class="order-detail-label">Date</div>
                <div class="order-detail-value">${formatDate(order.created_at)}</div>
            </div>
            <div class="order-detail-item">
                <div class="order-detail-label">Total Amount</div>
                <div class="order-detail-value" style="color: #B71C1C; font-size: 18px;">
                    ₱${parseFloat(order.total_amount).toFixed(2)}
                </div>
            </div>
            <div class="order-detail-item">
                <div class="order-detail-label">Payment Status</div>
                <div class="order-detail-value">${getPaymentStatusBadge(order.status)}</div>
            </div>
            <div class="order-detail-item">
                <div class="order-detail-label">Order Status</div>
                <div class="order-detail-value">${getOrderStatusBadge(order.order_status || order.status)}</div>
            </div>
        </div>

        <div class="order-items-section">
            <div class="order-items-title">Order Items</div>
            ${itemsHTML}
        </div>

        <div style="margin-top: 16px; padding: 16px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0284c7;">
            <div style="display: flex; align-items: center; gap: 8px; color: #0284c7; font-weight: 600; font-size: 12px;">
                <span class="realtime-indicator">
                    <span class="realtime-dot"></span>
                    Real-time tracking enabled
                </span>
            </div>
        </div>
    `;

    detailsContainer.innerHTML = detailsHTML;
    detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Helper Functions
function getPaymentStatusBadge(status) {
    const badges = {
        'PENDING': '<span class="status-badge status-pending">Pending Payment</span>',
        'PAID': '<span class="status-badge status-paid">Paid ✓</span>',
        'CANCELLED': '<span class="status-badge status-cancelled">Cancelled</span>',
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function getOrderStatusBadge(status) {
    const badges = {
        'PENDING': '<span class="status-badge status-pending">Pending</span>',
        'PAID': '<span class="status-badge status-paid">Paid</span>',
        'PREPARING': '<span class="status-badge status-preparing">Preparing</span>',
        'READY': '<span class="status-badge status-ready">Ready</span>',
        'COMPLETED': '<span class="status-badge status-completed">Completed</span>',
        'CANCELLED': '<span class="status-badge status-cancelled">Cancelled</span>',
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function getRatingDisplay(rating) {
    const stars = '⭐'.repeat(Math.floor(rating));
    return rating > 0 ? `${stars} (${rating}/5)` : 'No rating';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTimePending(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMins = Math.floor((now - created) / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

function escapeHtml(text) {
    const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
    return text.replace(/[&<>"']/g, m => map[m]);
}

function updateRecordsBadge(count) {
    const badge = document.getElementById('recordsBadge');
    if (badge) {
        badge.textContent = count;
        if (count > 0) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showErrorState(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
        const titleElement = element.querySelector('.records-empty-title');
        if (titleElement) {
            titleElement.textContent = 'Error Loading Data';
        }
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('customerSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilterSelect')?.value || '';

    let filtered = allOrders;

    if (searchTerm) {
        filtered = filtered.filter(order =>
            order.customer_name.toLowerCase().includes(searchTerm)
        );
    }

    if (statusFilter) {
        filtered = filtered.filter(order => order.status === statusFilter);
    }

    currentPage = 1;
    const tbody = document.getElementById('ordersTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No orders found matching your filters.</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filtered.slice(startIndex, startIndex + itemsPerPage);

    tbody.innerHTML = paginatedOrders.map(order => `
        <tr data-order-id="${order.id}">
            <td><strong>#${order.id}</strong></td>
            <td>${escapeHtml(order.customer_name)}</td>
            <td>${formatDate(order.created_at)}</td>
            <td><strong style="color: #B71C1C;">₱${parseFloat(order.total_amount).toFixed(2)}</strong></td>
            <td>${getPaymentStatusBadge(order.status)}</td>
            <td>${getOrderStatusBadge(order.order_status || order.status)}</td>
            <td>
                <button class="records-filter-btn" onclick="expandOrderDetails(${order.id})" style="font-size: 12px; padding: 6px 12px;">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');

    updatePagination(filtered.length);
}

function updatePagination(totalItems) {
    const pagination = document.getElementById('ordersPagination');
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}"
                onclick="goToPage(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `;

    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `
            <button class="pagination-btn ${currentPage === i ? 'active' : ''}"
                    onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    if (totalPages > 5) {
        html += '<span style="padding: 8px;">...</span>';
        html += `
            <button class="pagination-btn" onclick="goToPage(${totalPages})">
                ${totalPages}
            </button>
        `;
    }

    html += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
                onclick="goToPage(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}>
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;

    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    displayAllOrders();
}

function markOrderAsPaid(orderId) {
    if (!confirm('Mark this order as paid?')) return;

    fetch(`/api/orders/${orderId}/mark-paid/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✅ Order marked as paid');
            loadPendingOrders();
            loadAllOrders();
        } else {
            alert('❌ Error: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('❌ Error marking order as paid');
    });
}

// Real-time Updates
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }

    autoRefreshInterval = setInterval(() => {
        const activeTab = document.querySelector('.records-tab.active');
        if (activeTab) {
            const tabName = activeTab.dataset.tab;

            if (tabName === 'orders') {
                loadAllOrders();
            } else if (tabName === 'pending') {
                loadPendingOrders();
            } else if (tabName === 'paid') {
                loadPaidOrders();
            } else if (tabName === 'completed') {
                loadCompletedOrders();
            } else if (tabName === 'history') {
                loadTransactionHistory();
            }
        }
    }, REFRESH_INTERVAL);

    console.log('🔄 Auto-refresh started');
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('⏹️ Auto-refresh stopped');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Customer Records System...');
    initializeCustomerRecords();
    console.log('✅ Customer Records System initialized');
});

if (document.readyState !== 'loading') {
    initializeCustomerRecords();
}