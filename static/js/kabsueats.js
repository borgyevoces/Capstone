function openPage(evt, pageName) {
    var i, pagecontent, pagelinks;
    pagecontent = document.getElementsByClassName("pagecontent");
    for (i = 0; i < pagecontent.length; i++) {
        pagecontent[i].style.display = "none";
    }
    pagelinks = document.getElementsByClassName("pagelinks");
    for (i = 0; i < pagelinks.length; i++) {
        pagelinks[i].className = pagelinks[i].className.replace(" active", "");
    }
    document.getElementById(pageName).style.display = "block";
    evt.currentTarget.className += " active";

    // ✅ NEW: Initialize map when Map tab is opened
    if (pageName === 'Map' && typeof initializeMap === 'function') {
        setTimeout(() => {
            initializeMap();
        }, 100);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const defaultOpen = document.getElementById("defaultOpen");
    if (defaultOpen) {
        defaultOpen.click();
    }

    if (typeof applyFilters === 'function') {
        applyFilters();
    }

    if (typeof toggleSearchButton === 'function') {
        toggleSearchButton();
    }
});

function on() { document.getElementById("overlay").style.display = "block"; }
function off() { document.getElementById("overlay").style.display = "none"; }

function toggleSearchButton() {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.querySelector(".search_button");
    if (searchInput && searchButton) {
        if (searchInput.value.trim().length > 0) {
            searchButton.disabled = false;
            searchButton.style.opacity = "1";
            searchButton.style.cursor = "pointer";
        } else {
            searchButton.disabled = true;
            searchButton.style.opacity = "0.5";
            searchButton.style.cursor = "not-allowed";
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const homeButton = document.querySelector(".icon_home");
    if (homeButton) {
        homeButton.addEventListener("click", function (event) {
            event.preventDefault();
            window.location.href = "/kabsueats/";
        });
    }
});

// THE FIXED AND IMPROVED applyFilters() FUNCTION
function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const statusFilter = document.getElementById('statusFilter');
    const selectedStatus = statusFilter ? statusFilter.value : '';

    const alphabetFilter = document.getElementById('alphabetFilter');
    const selectedAlphabet = alphabetFilter ? alphabetFilter.value.toLowerCase() : '';

    const distanceFilter = document.getElementById('distanceFilter');
    const selectedDistanceSort = distanceFilter ? distanceFilter.value : '';

    const ratingsFilter = document.getElementById('ratingsFilter');
    const selectedRatingsSort = ratingsFilter ? ratingsFilter.value : '';

    const categoryFilter = document.getElementById('categoryFilter');
    const selectedCategory = categoryFilter ? categoryFilter.value.toLowerCase() : '';

    const currentUrl = new URL(window.location.href);
    const urlCategory = currentUrl.pathname.includes('karenderya') ? 'karenderya' : currentUrl.pathname.includes('cafe_establishments') ? 'cafe' : '';

    const allItems = Array.from(document.querySelectorAll('.food-establishment-item'));
    const container = document.querySelector('.nearest_slidescontainer');
    const noResultsMessage = document.getElementById('noResultsMessage');

    if (!container) {
        return;
    }

    let visibleItems = [];

    allItems.forEach(item => {
        const itemName = item.dataset.name || '';
        const itemStatus = item.dataset.status || '';
        const itemCategory = item.dataset.category || '';

        let isVisible = true;

        if (searchTerm && !itemName.includes(searchTerm)) {
            isVisible = false;
        }

        if (selectedStatus && itemStatus !== selectedStatus) {
            isVisible = false;
        }

        if (selectedAlphabet && !itemName.startsWith(selectedAlphabet)) {
            isVisible = false;
        }

        if (urlCategory && itemCategory !== urlCategory) {
            isVisible = false;
        }

         if (selectedCategory && itemCategory !== selectedCategory) {
            isVisible = false;
        }

        if (isVisible) {
            visibleItems.push(item);
        }
    });

    if (selectedAlphabet) {
        visibleItems.sort((a, b) => (a.dataset.name || '').localeCompare(b.dataset.name || ''));
        if (distanceFilter) distanceFilter.value = '';
        if (ratingsFilter) ratingsFilter.value = '';
    } else if (selectedDistanceSort === 'nearest') {
        visibleItems.sort((a, b) => {
            const distanceA = parseFloat(a.dataset.distance) || Infinity;
            const distanceB = parseFloat(b.dataset.distance) || Infinity;
            return distanceA - distanceB;
        });
        if (alphabetFilter) alphabetFilter.value = '';
        if (ratingsFilter) ratingsFilter.value = '';
    } else if (selectedDistanceSort === 'farthest') {
        visibleItems.sort((a, b) => {
            const distanceA = parseFloat(a.dataset.distance) || -Infinity;
            const distanceB = parseFloat(b.dataset.distance) || -Infinity;
            return distanceB - distanceA;
        });
        if (alphabetFilter) alphabetFilter.value = '';
        if (ratingsFilter) ratingsFilter.value = '';
    } else if (selectedRatingsSort === 'highest') {
        visibleItems.sort((a, b) => {
            const ratingA = parseFloat(a.dataset.rating) || 0;
            const ratingB = parseFloat(b.dataset.rating) || 0;
            return ratingB - ratingA;
        });
        if (alphabetFilter) alphabetFilter.value = '';
        if (distanceFilter) distanceFilter.value = '';
    } else if (selectedRatingsSort === 'lowest') {
        visibleItems.sort((a, b) => {
            const ratingA = parseFloat(a.dataset.rating) || 0;
            const ratingB = parseFloat(b.dataset.rating) || 0;
            return ratingA - ratingB;
        });
        if (alphabetFilter) alphabetFilter.value = '';
        if (distanceFilter) distanceFilter.value = '';
    }

    allItems.forEach(item => {
        item.style.display = 'none';
    });

    visibleItems.forEach(item => {
        item.style.display = '';
        container.appendChild(item);
    });

    if (noResultsMessage) {
        if (visibleItems.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
        }
    }
}

// Logout Modal Logic
const showLogoutModalButton = document.getElementById('showLogoutModal');
const logoutModal = document.getElementById('logoutModal');
const cancelLogoutButton = document.getElementById('cancelLogout');

function showModal() {
    if (logoutModal) {
        logoutModal.classList.remove('opacity-0', 'pointer-events-none');
        logoutModal.classList.add('opacity-100');
        const modalContent = logoutModal.querySelector('div');
        if (modalContent) {
            modalContent.classList.remove('-translate-y-4', 'scale-95');
            modalContent.classList.add('translate-y-0', 'scale-100');
        }
    }
}

function hideModal() {
     if (logoutModal) {
        logoutModal.classList.remove('opacity-100');
        logoutModal.classList.add('opacity-0', 'pointer-events-none');
        const modalContent = logoutModal.querySelector('div');
        if (modalContent) {
            modalContent.classList.remove('translate-y-0', 'scale-100');
            modalContent.classList.add('-translate-y-4', 'scale-95');
        }
    }
}

if (showLogoutModalButton) showLogoutModalButton.addEventListener('click', showModal);
if (cancelLogoutButton) cancelLogoutButton.addEventListener('click', hideModal);

if (logoutModal) {
    logoutModal.addEventListener('click', (event) => {
        if (event.target === logoutModal) {
            hideModal();
        }
    });
}

// ==========================================
// ✅ MAP INITIALIZATION AND LOCATION TRACKING
// ==========================================

let map;
let userMarker;
let userCircle;
let locationWatchId;
let markersGroup;
let isMapInitialized = false;

function initializeMap() {
    // Prevent multiple initializations
    if (isMapInitialized) {
        map.invalidateSize();
        return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }

    // ✅ INITIAL VIEW: Centered on Soldiers Hills IV area (coordinates from your image)
    // Latitude: 14.4246, Longitude: 120.9644 (approximate center of Soldiers Hills IV)
    const initialLat = 14.4246;
    const initialLng = 120.9644;
    const initialZoom = 16; // Good zoom level to see the neighborhood

    // Initialize the map
    map = L.map('map', {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: true
    });

    // Add OpenStreetMap tile layer (or use Esri World Imagery for satellite view)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> | <a href="https://leafletjs.com/">Leaflet</a>',
        maxZoom: 19
    }).addTo(map);

    // Initialize markers group
    markersGroup = L.layerGroup().addTo(map);

    // Add establishment markers
    if (typeof establishments !== 'undefined' && establishments.length > 0) {
        establishments.forEach(estab => {
            if (estab.latitude && estab.longitude) {
                // Custom icon for establishments
                const estabIcon = L.divIcon({
                    className: 'custom-establishment-marker',
                    html: `<div style="
                        background: #B71C1C;
                        color: white;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        font-size: 16px;
                    "><i class="fas fa-utensils"></i></div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                const marker = L.marker([estab.latitude, estab.longitude], {
                    icon: estabIcon
                }).addTo(markersGroup);

                // Popup with establishment info
                const popupContent = `
                    <div style="min-width: 200px;">
                        <h3 style="margin: 0 0 8px 0; color: #B71C1C; font-size: 16px; font-weight: bold;">
                            ${estab.name}
                        </h3>
                        ${estab.image ? `<img src="${estab.image}" alt="${estab.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">` : ''}
                        <p style="margin: 4px 0; font-size: 13px;">
                            <i class="fas fa-star" style="color: #FFD700;"></i>
                            <strong>${estab.rating || 'N/A'}</strong> (${estab.reviews || 0} reviews)
                        </p>
                        <p style="margin: 4px 0; font-size: 13px;">
                            <i class="fas fa-map-marker-alt" style="color: #B71C1C;"></i>
                            ${estab.distance || 'N/A'} km away
                        </p>
                        <p style="margin: 4px 0; font-size: 13px;">
                            <i class="fas fa-door-${estab.status === 'Open' ? 'open' : 'closed'}" style="color: ${estab.status === 'Open' ? '#4CAF50' : '#f44336'};"></i>
                            <strong style="color: ${estab.status === 'Open' ? '#4CAF50' : '#f44336'};">${estab.status}</strong>
                        </p>
                        ${estab.url ? `<a href="${estab.url}" style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #B71C1C; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">View Details</a>` : ''}
                    </div>
                `;

                marker.bindPopup(popupContent);
            }
        });
    }

    // ✅ Setup "Show My Location" button
    const showLocationBtn = document.getElementById('showLocationBtn');
    if (showLocationBtn) {
        showLocationBtn.addEventListener('click', startLocationTracking);
    }

    isMapInitialized = true;
    console.log('✅ Map initialized successfully with initial view');
}

// ✅ REAL-TIME LOCATION TRACKING
function startLocationTracking() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    const showLocationBtn = document.getElementById('showLocationBtn');

    // Show loading state
    if (showLocationBtn) {
        showLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
        showLocationBtn.disabled = true;
    }

    // Get current position and start watching
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            // Update or create user marker
            updateUserLocation(lat, lng, accuracy);

            // Center map on user location
            map.setView([lat, lng], 17, {
                animate: true,
                duration: 1
            });

            // Start watching position for real-time updates
            if (locationWatchId) {
                navigator.geolocation.clearWatch(locationWatchId);
            }

            locationWatchId = navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;
                    updateUserLocation(lat, lng, accuracy);
                },
                (error) => {
                    console.error('Error watching position:', error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );

            // Update button state
            if (showLocationBtn) {
                showLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Tracking Location';
                showLocationBtn.disabled = false;
                showLocationBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)';
            }

            console.log('✅ Location tracking started');
        },
        (error) => {
            console.error('Error getting location:', error);
            let errorMessage = 'Unable to get your location. ';

            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please enable location permissions.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
            }

            alert(errorMessage);

            // Reset button state
            if (showLocationBtn) {
                showLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Show My Location';
                showLocationBtn.disabled = false;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Update user location marker
function updateUserLocation(lat, lng, accuracy) {
    // Custom icon for user location
    const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `<div style="
            background: #2196F3;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            position: relative;
        ">
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 8px;
                height: 8px;
                background: white;
                border-radius: 50%;
            "></div>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    // Remove existing user marker and circle
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    if (userCircle) {
        map.removeLayer(userCircle);
    }

    // Add new user marker
    userMarker = L.marker([lat, lng], {
        icon: userIcon,
        zIndexOffset: 1000
    }).addTo(map);

    userMarker.bindPopup(`
        <div style="text-align: center;">
            <strong style="color: #2196F3;">You are here</strong><br>
            <small>Accuracy: ±${Math.round(accuracy)} meters</small>
        </div>
    `);

    // Add accuracy circle
    userCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#2196F3',
        fillColor: '#2196F3',
        fillOpacity: 0.1,
        weight: 1
    }).addTo(map);

    console.log(`📍 Location updated: ${lat}, ${lng} (±${Math.round(accuracy)}m)`);
}

// Stop location tracking
function stopLocationTracking() {
    if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }

    const showLocationBtn = document.getElementById('showLocationBtn');
    if (showLocationBtn) {
        showLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Show My Location';
        showLocationBtn.style.background = 'linear-gradient(135deg, #B71C1C 0%, #8c1616 100%)';
    }

    console.log('🛑 Location tracking stopped');
}

// Search establishments on map
function searchOnMap() {
    const searchInput = document.getElementById('mapSearchInput');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase().trim();

    if (!searchTerm) {
        // Show all markers
        markersGroup.eachLayer(marker => {
            marker.setOpacity(1);
        });
        return;
    }

    let foundCount = 0;
    let firstFoundMarker = null;

    markersGroup.eachLayer(marker => {
        const popupContent = marker.getPopup().getContent().toLowerCase();

        if (popupContent.includes(searchTerm)) {
            marker.setOpacity(1);
            foundCount++;
            if (!firstFoundMarker) {
                firstFoundMarker = marker;
            }
        } else {
            marker.setOpacity(0.3);
        }
    });

    if (firstFoundMarker) {
        map.setView(firstFoundMarker.getLatLng(), 17, {
            animate: true,
            duration: 1
        });
        firstFoundMarker.openPopup();
    }

    if (foundCount === 0) {
        alert('No establishments found matching your search.');
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    stopLocationTracking();
});

function toggleDropdown() {
    document.getElementById("userDropdown").classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.profile-image')) {
        var dropdowns = document.getElementsByClassName("dropdown-menu");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

function openSettingsModal(event) {
    event.preventDefault();
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('settingsModal');
    if (event.target === modal) {
        closeSettingsModal();
    }

    if (!event.target.matches('.profile-image')) {
        var dropdowns = document.getElementsByClassName("dropdown-menu");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        const output = document.getElementById('profileImagePreview');
        if (output) {
            output.src = reader.result;
        }
    };
    if (event.target.files && event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileUpdateForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(profileForm);

            if (typeof UPDATE_PROFILE_URL === 'undefined') {
                console.error('UPDATE_PROFILE_URL is not defined');
                alert('Configuration error. Please contact support.');
                return;
            }

            fetch(UPDATE_PROFILE_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Profile updated successfully!');
                    closeSettingsModal();

                    if (data.profile_picture_url) {
                        const profileImages = document.querySelectorAll('.profile-image');
                        profileImages.forEach(img => {
                            img.src = data.profile_picture_url;
                        });
                    }
                    const usernameInput = document.getElementById('id_username');
                    if (usernameInput) {
                        usernameInput.value = data.username;
                    }
                } else {
                    alert('Error updating profile: ' + (data.errors || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                alert('An unexpected error occurred.');
            });
        });
    }
});

// =====================================================PAYMENTS================================================

window.addToCart = function(itemId, quantity, csrfToken, buttonElement = null, itemName = 'Item', action = 'add') {
    return new Promise((resolve, reject) => {

        if (typeof IS_USER_AUTHENTICATED === 'undefined' || !IS_USER_AUTHENTICATED) {
            if (confirm("You must log in to order. Go to Login page?")) {
                if(typeof LOGIN_REGISTER_URL !== 'undefined') {
                    window.location.href = LOGIN_REGISTER_URL;
                } else {
                     console.error("LOGIN_REGISTER_URL is not defined.");
                }
            }
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = buttonElement.dataset.originalText || '<i class="fas fa-cart-plus"></i> Add to Cart';
            }
            return reject(new Error("User not authenticated."));
        }

        if (buttonElement) {
            buttonElement.dataset.originalText = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        }

        const data = {
            item_id: itemId,
            quantity: quantity,
            action: action
        };

        if (typeof ADD_TO_CART_URL === 'undefined') {
            console.error("ADD_TO_CART_URL is not defined.");
            return reject(new Error("Configuration error."));
        }

        fetch(ADD_TO_CART_URL, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'menu_item_id': itemId,
                'quantity': quantity
            })
        })
        .then(response => {
            if (response.status === 409) {
                return response.json().then(data => {
                    if (data.error_type === 'DIFFERENT_ESTABLISHMENT') {
                        if (confirm(data.message)) {
                            return window.addToCart(itemId, quantity, csrfToken, buttonElement, itemName, 'replace')
                                .then(resolve)
                                .catch(reject);
                        } else {
                            return Promise.reject(new Error("Cart operation cancelled by user."));
                        }
                    } else {
                         return Promise.reject(new Error(data.message || "An error occurred."));
                    }
                });
            } else if (!response.ok) {
                return response.json().catch(() => ({ message: 'Server error occurred.' })).then(errorData => {
                    throw new Error(errorData.message || 'Unknown network error.');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                if (typeof updateCartBadge === 'function') {
                    updateCartBadge(data.cart_count);
                }
                alert(data.message);

                if (buttonElement && buttonElement.dataset.action === 'buy_now') {
                     if(typeof VIEW_CART_URL !== 'undefined') {
                        window.location.href = VIEW_CART_URL;
                     } else {
                        console.error("VIEW_CART_URL is not defined.");
                     }
                }

                resolve();
            } else {
                alert(`Failed to add item to cart: ${data.message}`);
                reject(new Error(data.message));
            }
        })
        .catch(error => {
            console.error('Add to Cart Error:', error);
            if (error.message !== "Cart operation cancelled by user.") {
                alert(`An error occurred: ${error.message}`);
            }
            reject(error);
        })
        .finally(() => {
            const isRedirecting = (typeof VIEW_CART_URL !== 'undefined' && window.location.href.includes(VIEW_CART_URL)) ||
                                  (typeof LOGIN_REGISTER_URL !== 'undefined' && window.location.href.includes(LOGIN_REGISTER_URL));

            if (buttonElement && !isRedirecting) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = buttonElement.dataset.originalText || '<i class="fas fa-cart-plus"></i> Add to Cart';
            }
        });
    });
};

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
// ✅ SCROLL TO TOP BUTTON - COMPLETE FIX
// ==========================================

(function initScrollToTop() {
    'use strict';

    let scrollBtn = null;
    let scrollTimeout = null;

    // Throttle function to improve performance
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Function to show/hide scroll button
    function toggleScrollButton() {
        if (!scrollBtn) return;

        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollPosition > 300) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    }

    // Smooth scroll to top function
    function scrollToTop(e) {
        e.preventDefault();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Initialize the scroll button
    function init() {
        scrollBtn = document.getElementById('scrollToTopBtn');

        if (!scrollBtn) {
            console.error('❌ Scroll to top button not found in DOM');
            return;
        }

        console.log('✅ Scroll to top button initialized');

        // Add scroll event listener with throttle for better performance
        window.addEventListener('scroll', throttle(toggleScrollButton, 100), { passive: true });

        // Add click event listener
        scrollBtn.addEventListener('click', scrollToTop);

        // Check initial scroll position
        toggleScrollButton();
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();