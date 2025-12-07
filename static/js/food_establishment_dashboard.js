// ==========================================
// FOOD ESTABLISHMENT DASHBOARD JS - COMPLETE WITH ULTRA-FAST ADDRESS
// ==========================================

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let isSubmitting = false;
const SUBMISSION_LOCK_KEY = 'menu_submission_lock';
const LOCK_TIMEOUT = 5000;

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
// SUBMISSION LOCK
// ==========================================
function acquireSubmissionLock() {
    const now = Date.now();
    const lockData = localStorage.getItem(SUBMISSION_LOCK_KEY);

    if (lockData) {
        try {
            const { timestamp } = JSON.parse(lockData);
            if (now - timestamp < LOCK_TIMEOUT) {
                return false;
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
// ✅ ULTRA-FAST ADDRESS GEOCODING (RACE CONDITION)
// Gets DETAILED street address, not just city name
// ==========================================
function getAddressFromCoordinates(lat, lng) {
    return new Promise((resolve) => {
        let resolved = false;
        const startTime = Date.now();

        // ✅ Provider 1: Nominatim (Best for detailed street addresses)
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

        // ✅ Provider 2: LocationIQ (Good detail)
        const locationIQUrl = `https://us1.locationiq.com/v1/reverse.php?key=pk.0f147952a41c555c5b70614039fd148b&lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

        // ✅ Provider 3: BigDataCloud (Fallback)
        const bigDataCloudUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

        // ✅ FALLBACK: Show coordinates after 2 seconds (longer timeout for better results)
        const fallbackTimeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.log('⚠️ Using coordinates (geocoding timeout)');
                resolve({
                    success: false,
                    address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
                    provider: 'coordinates'
                });
            }
        }, 2000);

        // ✅ Helper function to build detailed address
        function buildDetailedAddress(addressData) {
            const parts = [];

            // Add house number + road (most specific)
            if (addressData.house_number && addressData.road) {
                parts.push(`${addressData.house_number} ${addressData.road}`);
            } else if (addressData.road) {
                parts.push(addressData.road);
            }

            // Add neighborhood/suburb
            if (addressData.neighbourhood) {
                parts.push(addressData.neighbourhood);
            } else if (addressData.suburb) {
                parts.push(addressData.suburb);
            }

            // Add city/municipality
            if (addressData.city) {
                parts.push(addressData.city);
            } else if (addressData.municipality) {
                parts.push(addressData.municipality);
            } else if (addressData.town) {
                parts.push(addressData.town);
            }

            // Add province/state
            if (addressData.state) {
                parts.push(addressData.state);
            } else if (addressData.province) {
                parts.push(addressData.province);
            }

            // Add country
            if (addressData.country) {
                parts.push(addressData.country);
            }

            return parts.join(', ');
        }

        // ✅ Nominatim (OSM) - Priority for detailed addresses
        fetch(nominatimUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'KabsuEats/1.0'
            },
            signal: AbortSignal.timeout(3000)
        })
        .then(r => r.json())
        .then(data => {
            if (resolved) return;

            let address = null;

            // Try to build detailed address from components
            if (data.address) {
                address = buildDetailedAddress(data.address);
            }

            // Fallback to display_name if components don't work
            if (!address || address === 'Philippines') {
                address = data.display_name;
            }

            if (address && address.length > 10) {
                resolved = true;
                clearTimeout(fallbackTimeout);
                console.log(`✅ Nominatim (${Date.now() - startTime}ms):`, address);
                resolve({
                    success: true,
                    address: address,
                    provider: 'Nominatim'
                });
            }
        })
        .catch(err => console.log('Nominatim error:', err));

        // ✅ LocationIQ (Backup with address details)
        fetch(locationIQUrl, {
            signal: AbortSignal.timeout(3000)
        })
        .then(r => r.json())
        .then(data => {
            if (resolved) return;

            let address = null;

            // Try to build detailed address
            if (data.address) {
                address = buildDetailedAddress(data.address);
            }

            // Fallback to display_name
            if (!address || address === 'Philippines') {
                address = data.display_name;
            }

            if (address && address.length > 10) {
                resolved = true;
                clearTimeout(fallbackTimeout);
                console.log(`✅ LocationIQ (${Date.now() - startTime}ms):`, address);
                resolve({
                    success: true,
                    address: address,
                    provider: 'LocationIQ'
                });
            }
        })
        .catch(err => console.log('LocationIQ error:', err));

        // ✅ BigDataCloud (Last resort - less detailed)
        fetch(bigDataCloudUrl, { signal: AbortSignal.timeout(3000) })
        .then(r => r.json())
        .then(data => {
            if (resolved) return;

            const parts = [];

            // Try to get street-level detail
            if (data.localityInfo && data.localityInfo.administrative) {
                const admin = data.localityInfo.administrative;

                // Get most specific level first
                for (let i = admin.length - 1; i >= 0; i--) {
                    if (admin[i].name && admin[i].name !== 'Philippines') {
                        parts.push(admin[i].name);
                        if (parts.length >= 3) break; // Limit to 3 levels
                    }
                }
            }

            // Add general locality if we have it
            if (data.locality && !parts.includes(data.locality)) {
                parts.unshift(data.locality);
            }

            if (data.principalSubdivision && !parts.includes(data.principalSubdivision)) {
                parts.push(data.principalSubdivision);
            }

            if (parts.length > 0) {
                resolved = true;
                clearTimeout(fallbackTimeout);
                const address = parts.join(', ');
                console.log(`✅ BigDataCloud (${Date.now() - startTime}ms):`, address);
                resolve({
                    success: true,
                    address: address,
                    provider: 'BigDataCloud'
                });
            }
        })
        .catch(err => console.log('BigDataCloud error:', err));
    });
}

// ==========================================
// ✅ INSTANT ADDRESS UPDATE WITH VISUAL FEEDBACK
// ==========================================
async function updateAddressFromCoords(latlng) {
    console.log('🔍 Getting address for:', latlng);

    const addressField = document.getElementById('id_address');
    const locationInfo = document.getElementById('previousLocationInfo');

    if (!addressField) {
        console.error('❌ Address field not found');
        return;
    }

    // ✅ INSTANT LOADING STATE
    addressField.value = '📍 Getting address...';
    addressField.style.backgroundColor = '#fff3cd';
    addressField.style.fontStyle = 'italic';
    addressField.classList.add('loading');

    if (locationInfo) {
        locationInfo.innerHTML = `
            <i class="fas fa-spinner fa-spin" style="color: #ffc107;"></i>
            <strong>Fetching address...</strong>
        `;
        locationInfo.style.color = '#666';
    }

    // ✅ GET ADDRESS (Race condition with multiple providers)
    const result = await getAddressFromCoordinates(latlng.lat, latlng.lng);

    // ✅ UPDATE FIELD WITH RESULT
    addressField.value = result.address;
    addressField.style.fontStyle = 'normal';
    addressField.classList.remove('loading');

    if (result.success) {
        // ✅ GREEN SUCCESS ANIMATION
        addressField.style.backgroundColor = '#d4edda';
        addressField.style.borderColor = '#28a745';

        setTimeout(() => {
            addressField.style.backgroundColor = '#f5f5f5';
            addressField.style.borderColor = '#ced4da';
        }, 2000);

        if (locationInfo) {
            locationInfo.innerHTML = `
                <i class="fas fa-check-circle" style="color: #28a745;"></i>
                <strong style="color: #28a745;">Address found!</strong> ${result.address}
            `;
            locationInfo.style.color = '#28a745';
        }
    } else {
        // ⚠️ YELLOW WARNING (Coordinates)
        addressField.style.backgroundColor = '#fff3cd';
        addressField.style.borderColor = '#ffc107';

        setTimeout(() => {
            addressField.style.backgroundColor = '#f5f5f5';
            addressField.style.borderColor = '#ced4da';
        }, 2000);

        if (locationInfo) {
            locationInfo.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i>
                Using coordinates. Address lookup was slow.
            `;
            locationInfo.style.color = '#ffc107';
        }
    }

    console.log('✅ Address field updated:', result.address);
}

// ==========================================
// ADD MENU ITEM FORM
// ==========================================
function setupAddMenuItemForm() {
    const addMenuForm = document.getElementById('addMenuItemForm');

    if (!addMenuForm) {
        console.log('⚠️ Add menu form not found');
        return;
    }

    const newForm = addMenuForm.cloneNode(true);
    addMenuForm.parentNode.replaceChild(newForm, addMenuForm);

    console.log('✅ Setting up add menu form handler');

    newForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) {
            showNotification('⏳ Please wait, submission in progress...', 'info');
            return false;
        }

        if (!acquireSubmissionLock()) {
            showNotification('⏳ Please wait, submission in progress...', 'info');
            return false;
        }

        const formData = new FormData(this);
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        const name = formData.get('name');
        const price = formData.get('price');
        const description = formData.get('description');

        if (!name || !price || !description) {
            showNotification('❌ Please fill in all required fields', 'error');
            releaseSubmissionLock();
            return false;
        }

        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            showNotification('❌ Security token missing. Please refresh the page.', 'error');
            releaseSubmissionLock();
            return false;
        }

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
            if (data.success) {
                if (data.skipped) {
                    return;
                }

                showNotification('✅ ' + data.message, 'success');

                if (data.item) {
                    const existingItem = document.querySelector(`.menu-card[data-item-id="${data.item.id}"]`);
                    if (!existingItem) {
                        addMenuItemToGrid(data.item);
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
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            isSubmitting = false;
            releaseSubmissionLock();
        });

        return false;
    });
}

// ==========================================
// ADD MENU ITEM TO GRID
// ==========================================
function addMenuItemToGrid(item) {
    const menuGrid = document.querySelector('.menu-grid');
    const noItems = document.querySelector('.no-items');

    if (noItems) {
        noItems.remove();
    }

    const existingItem = document.querySelector(`.menu-card[data-item-id="${item.id}"]`);
    if (existingItem) {
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
                <form action="/toggle-top-seller/${item.id}/" method="post" style="display: contents;">
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
}

// ==========================================
// UPDATE STORE DETAILS
// ==========================================
function setupUpdateStoreDetailsForm() {
    const updateForm = document.getElementById('updateStoreDetailsForm');

    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

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
// ✅ MAP FUNCTIONALITY - INSTANT ADDRESS UPDATE
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

    // ✅ HIGH RESOLUTION MAP LAYERS
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

    // ✅ INSTANT ADDRESS UPDATE ON CLICK/DRAG
    function validateAndUpdateAddress(latlng) {
        const distance = map.distance(latlng, [cvsuLat, cvsuLng]);

        if (distance <= RADIUS) {
            document.getElementById('id_latitude').value = latlng.lat.toFixed(6);
            document.getElementById('id_longitude').value = latlng.lng.toFixed(6);

            // ✅ INSTANT ADDRESS FETCH
            updateAddressFromCoords(latlng);

            return true;
        } else {
            if (locationInfo) {
                locationInfo.innerHTML = `
                    <i class="fas fa-exclamation-circle" style="color: #dc3545;"></i>
                    Please pin inside the red circle (within 500m of CvSU-Bacoor).
                `;
                locationInfo.style.color = '#dc3545';
            }
            return false;
        }
    }

    marker.on('dragend', function(e) {
        const position = marker.getLatLng();
        if (!validateAndUpdateAddress(position)) {
            marker.setLatLng([prevLat, prevLng]);
        }
    });

    map.on('click', function(e) {
        if (validateAndUpdateAddress(e.latlng)) {
            marker.setLatLng(e.latlng);
        }
    });

    document.getElementById('id_latitude').value = prevLat.toFixed(6);
    document.getElementById('id_longitude').value = prevLng.toFixed(6);

    // ✅ LOAD INITIAL ADDRESS IF EXISTS
    if (prevLat && prevLng && (Math.abs(prevLat - cvsuLat) > 0.0001 || Math.abs(prevLng - cvsuLng) > 0.0001)) {
        updateAddressFromCoords({ lat: prevLat, lng: prevLng });
    }
}

function focusOnCvSU() {
    if (window._kabsueats_map && window._kabsueats_marker) {
        const cvsuLat = 14.412768;
        const cvsuLng = 120.981348;

        window._kabsueats_map.setView([cvsuLat, cvsuLng], 16);
        window._kabsueats_marker.setLatLng([cvsuLat, cvsuLng]);

        document.getElementById('id_latitude').value = cvsuLat.toFixed(6);
        document.getElementById('id_longitude').value = cvsuLng.toFixed(6);

        updateAddressFromCoords({ lat: cvsuLat, lng: cvsuLng });

        const locationInfo = document.getElementById('previousLocationInfo');
        if (locationInfo) {
            locationInfo.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                Getting CvSU address...
            `;
            locationInfo.style.color = '#666';
        }
    }
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

    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get('login_success');

    if (loginSuccess === 'true') {
        showNotification('✅ Successfully logged in! Welcome to your dashboard.', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadNotifications();
    setInterval(pollNotifications, 60000);

    setupUpdateStoreDetailsForm();
    setupAddMenuItemForm();
    setupEditMenuItemForm();

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

    /* ✅ Address field loading animation */
    #id_address.loading {
        background: linear-gradient(90deg, #fff3cd 0%, #ffeaa7 50%, #fff3cd 100%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    /* ✅ Address field success animation */
    #id_address.updated {
        transition: all 0.3s ease;
    }

    #id_address[readonly] {
        background-color: #f8f9fa !important;
        color: #495057;
        border: 1px solid #ced4da;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);