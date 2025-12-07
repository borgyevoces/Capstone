// ==========================================
// FOOD ESTABLISHMENT DASHBOARD JS - COMPLETE FIXED VERSION
// ==========================================

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let isSubmitting = false;
const SUBMISSION_LOCK_KEY = 'menu_submission_lock';
const LOCK_TIMEOUT = 5000; // 5 seconds
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
// GLOBAL SUBMISSION LOCK (CROSS-TAB)
// ==========================================
function acquireSubmissionLock() {
    const now = Date.now();
    const lockData = localStorage.getItem(SUBMISSION_LOCK_KEY);

    if (lockData) {
        try {
            const { timestamp } = JSON.parse(lockData);
            if (now - timestamp < LOCK_TIMEOUT) {
                return false; // Lock is held
            }
        } catch (e) {
            localStorage.removeItem(SUBMISSION_LOCK_KEY);
        }
    }

    localStorage.setItem(SUBMISSION_LOCK_KEY, JSON.stringify({
        timestamp: now,
        tabId: Math.random()
    }));
    return true;
}

function releaseSubmissionLock() {
    try {
        localStorage.removeItem(SUBMISSION_LOCK_KEY);
    } catch (e) {
        console.error('Error releasing lock:', e);
    }
}

// ==========================================
// ✅ FIXED: ADD MENU ITEM FORM HANDLER
// ==========================================
function setupAddMenuItemForm() {
    const addMenuForm = document.getElementById('addMenuItemForm');

    if (!addMenuForm) {
        console.log('⚠️ Add menu form not found');
        return;
    }

    // ✅ CRITICAL: Remove any existing event listeners by cloning
    const newForm = addMenuForm.cloneNode(true);
    addMenuForm.parentNode.replaceChild(newForm, addMenuForm);

    console.log('✅ Setting up add menu form handler');

    // ✅ Now attach single event listener
    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log('📝 Form submit triggered');

        // ✅ Prevent double submission
        if (isSubmitting) {
            console.log('⏳ Already submitting, ignoring...');
            showNotification('⏳ Please wait, submission in progress...', 'info');
            return false;
        }

        // ✅ Global lock check
        if (!acquireSubmissionLock()) {
            console.log('🔒 Submission locked by another tab');
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
            releaseSubmissionLock();
            return false;
        }

        // Get CSRF token
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            showNotification('❌ Security token missing. Please refresh the page.', 'error');
            releaseSubmissionLock();
            return false;
        }

        console.log('🚀 Submitting menu item:', name);

        // Set flags
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

                // ✅ Check if item already exists before adding
                if (data.item) {
                    const existingItem = document.querySelector(`.menu-card[data-item-id="${data.item.id}"]`);
                    if (!existingItem) {
                        console.log('➕ Adding new item to grid');
                        addMenuItemToGrid(data.item);
                    } else {
                        console.log('⚠️ Item already exists in grid');
                    }
                }

                setTimeout(() => {
                    closeModal('addMenuItemModal');
                    newForm.reset();
                }, 1000);
            } else {
                showNotification('❌ ' + (data.error || 'Failed to add menu item'), 'error');
            }
        })
        .catch(error => {
            console.error('❌ Error:', error);
            showNotification('❌ ' + error.message, 'error');
        })
        .finally(() => {
            console.log('🔓 Releasing locks');
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            isSubmitting = false;
            releaseSubmissionLock();
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

    // ✅ Check if item already exists (prevent duplicates)
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
// ✅ UPDATE STORE DETAILS FORM
// ==========================================
function setupUpdateStoreDetailsForm() {
    const updateForm = document.getElementById('updateStoreDetailsForm');

    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            // ✅ Validate coordinates
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
                        document.getElementById('establishmentCategory').textContent = data.category;
                    }

                    if (data.amenities) {
                        document.getElementById('establishmentAmenities').textContent = data.amenities || 'N/A';
                    }

                    if (data.payment_methods) {
                        document.getElementById('establishmentPaymentMethods').textContent = data.payment_methods;
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
// ✅ MAP FUNCTIONALITY WITH REVERSE GEOCODING
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

    if (window._kabsueats_map) {
        try {
            window._kabsueats_map.remove();
        } catch (err) {}
    }

    const cvsuLat = 14.412768;
    const cvsuLng = 120.981348;
    const RADIUS = 500;

    const prevLat = parseFloat(document.getElementById('previous_lat').value) || cvsuLat;
    const prevLng = parseFloat(document.getElementById('previous_lng').value) || cvsuLng;

    const locationInfo = document.getElementById('previousLocationInfo');
    if (locationInfo) {
        if (prevLat && prevLng && (Math.abs(prevLat - cvsuLat) > 0.0001 || Math.abs(prevLng - cvsuLng) > 0.0001)) {
            locationInfo.innerHTML = `<i class="fas fa-map-pin"></i> Current location: ${prevLat.toFixed(6)}, ${prevLng.toFixed(6)}`;
        } else {
            locationInfo.innerHTML = `<i class="fas fa-info-circle"></i> Click inside the red circle to set your location within 500m of CvSU-Bacoor.`;
        }
    }

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 22
    });

    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const hybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const terrainLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 20
    });

    const baseMaps = {
        "Hybrid (Satellite + Labels)": hybridLayer,
        "Satellite": satelliteLayer,
        "Street": streetLayer,
        "Terrain": terrainLayer
    };

    const map = L.map('map', {
        layers: [hybridLayer],
        maxZoom: 22,
        minZoom: 10
    }).setView([cvsuLat, cvsuLng], 16);

    window._kabsueats_map = map;

    L.control.layers(baseMaps).addTo(map);

    L.marker([cvsuLat, cvsuLng]).addTo(map)
        .bindPopup('<b>CvSU-Bacoor Campus</b>')
        .openPopup();

    L.circle([cvsuLat, cvsuLng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
        radius: RADIUS
    }).addTo(map);

    const marker = L.marker([prevLat, prevLng], {
        draggable: true
    }).addTo(map);

    window._kabsueats_marker = marker;

    // ✅ Reverse Geocode Function
    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'KabsuEats/1.0'
                    }
                }
            );
            const data = await response.json();

            if (data && data.display_name) {
                return data.display_name;
            } else {
                return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    }

    // ✅ Validate Position + Geocode
    async function validatePosition(latlng) {
        const distance = map.distance(latlng, [cvsuLat, cvsuLng]);

        if (distance <= RADIUS) {
            document.getElementById('id_latitude').value = latlng.lat.toFixed(6);
            document.getElementById('id_longitude').value = latlng.lng.toFixed(6);

            if (locationInfo) {
                locationInfo.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success);"></i> Location set: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
                locationInfo.style.color = 'var(--success)';
            }

            // ✅ Reverse Geocode
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
            if (locationInfo) {
                locationInfo.innerHTML = `<i class="fas fa-exclamation-circle" style="color: var(--error);"></i> Please pin inside the red circle (within 500m of CvSU-Bacoor).`;
                locationInfo.style.color = 'var(--error)';
            }

            const addressDisplay = document.getElementById('geocodedAddressDisplay');
            if (addressDisplay) {
                addressDisplay.style.display = 'none';
            }
            currentGeocodedAddress = '';

            return false;
        }
    }

    marker.on('dragend', async function(e) {
        const position = marker.getLatLng();
        if (!await validatePosition(position)) {
            marker.setLatLng([prevLat, prevLng]);
        }
    });

    map.on('click', async function(e) {
        if (await validatePosition(e.latlng)) {
            marker.setLatLng(e.latlng);
        }
    });

    document.getElementById('id_latitude').value = prevLat.toFixed(6);
    document.getElementById('id_longitude').value = prevLng.toFixed(6);

    // ✅ Load initial address
    if (prevLat && prevLng) {
        validatePosition({ lat: prevLat, lng: prevLng });
    }

    mapInitialized = true;
}

function focusOnCvSU() {
    if (window._kabsueats_map && window._kabsueats_marker) {
        const cvsuLat = 14.412768;
        const cvsuLng = 120.981348;

        window._kabsueats_map.setView([cvsuLat, cvsuLng], 16);
        window._kabsueats_marker.setLatLng([cvsuLat, cvsuLng]);

        document.getElementById('id_latitude').value = cvsuLat.toFixed(6);
        document.getElementById('id_longitude').value = cvsuLng.toFixed(6);

        const locationInfo = document.getElementById('previousLocationInfo');
        if (locationInfo) {
            locationInfo.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success);"></i> Location set to CvSU-Bacoor Campus`;
            locationInfo.style.color = 'var(--success)';
        }

        const addressDisplay = document.getElementById('geocodedAddressDisplay');
        if (addressDisplay) {
            addressDisplay.style.display = 'none';
        }
        currentGeocodedAddress = '';
    }
}

// ✅ NEW: Confirm Location and Update Address
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

    // ✅ Update address field
    const addressField = document.getElementById('id_address');
    if (addressField) {
        addressField.value = currentGeocodedAddress;
    }

    // ✅ Update location status
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
        locationStatus.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success);"></i> Location set: ${lat}, ${lng}`;
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
                list.innerHTML = data.notifications.map(notif => `
                    <div class="notification-item ${notif.is_read ? '' : 'unread'}" onclick="markNotificationRead(${notif.id})">
                        <div class="notification-icon">
                            <i class="fas fa-${getNotificationIcon(notif.type)}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-message">${notif.message}</div>
                            <div class="notification-details">${notif.details || ''}</div>
                            <div class="notification-time">${notif.time}</div>
                        </div>
                    </div>
                `).join('');

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
            }
        })
        .catch(error => {
            console.error('Error polling notifications:', error);
        });
    }
}

function getNotificationIcon(type) {
    const icons = {
        'order': 'shopping-cart',
        'review': 'star',
        'message': 'envelope',
        'alert': 'exclamation-circle'
    };
    return icons[type] || 'bell';
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function markNotificationRead(notificationId) {
    fetch(`/api/notifications/${notificationId}/read/`, {
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
            transform: scale(1.02);
        }
    }
`;
document.head.appendChild(style)