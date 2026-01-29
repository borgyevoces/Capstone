// ==========================================
// ✅ IMAGE PRELOADING HELPER - ADDED FOR OPTIMIZATION
// ==========================================
function preloadBestSellerImages(items) {
    const imagePromises = items.map(item => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                console.log(`✅ Preloaded: ${item.name}`);
                resolve(item.image_url);
            };
            img.onerror = () => {
                console.log(`⚠️ Failed to load: ${item.name}, using placeholder`);
                resolve('/static/images/placeholder-food.jpg');
            };
            img.src = item.image_url || '/static/images/placeholder-food.jpg';
        });
    });
    return Promise.all(imagePromises);
}

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

    // âœ… Update statuses on page load
    if (typeof updateEstablishmentStatuses === 'function') {
        updateEstablishmentStatuses();
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

// ============================================
// âœ… FIXED AND IMPROVED applyFilters() FUNCTION
// ============================================
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

        // Search filter
        if (searchTerm && !itemName.includes(searchTerm)) {
            isVisible = false;
        }

        // âœ… CRITICAL FIX: Status filter now works correctly
        if (selectedStatus && itemStatus !== selectedStatus) {
            isVisible = false;
        }

        // Alphabetical filter
        if (selectedAlphabet && !itemName.startsWith(selectedAlphabet)) {
            isVisible = false;
        }

        // URL category filter
        if (urlCategory && itemCategory !== urlCategory) {
            isVisible = false;
        }

        // Category dropdown filter
        if (selectedCategory && itemCategory !== selectedCategory) {
            isVisible = false;
        }

        if (isVisible) {
            visibleItems.push(item);
        }
    });

    // Apply sorting
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

    // Hide all items first
    allItems.forEach(item => {
        item.style.display = 'none';
    });

    // Show filtered items
    visibleItems.forEach(item => {
        item.style.display = '';
        container.appendChild(item);
    });

    // Show/hide no results message
    if (noResultsMessage) {
        if (visibleItems.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
        }
    }
}

// ============================================
// âœ… REAL-TIME STATUS UPDATE FUNCTION
// ============================================
function updateEstablishmentStatuses() {
    const establishments = document.querySelectorAll('.food-establishment-item');

    establishments.forEach(establishment => {
        const statusIndicator = establishment.querySelector('.status-indicator');
        if (!statusIndicator) return;

        const openingTime = statusIndicator.dataset.openingTime;
        const closingTime = statusIndicator.dataset.closingTime;

        if (!openingTime || !closingTime) {
            establishment.dataset.status = 'Closed';
            updateStatusDisplay(statusIndicator, 'Closed');
            return;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [openHour, openMin] = openingTime.split(':').map(Number);
        const [closeHour, closeMin] = closingTime.split(':').map(Number);

        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;

        let isOpen = false;

        if (openMinutes <= closeMinutes) {
            isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
        } else {
            isOpen = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
        }

        const newStatus = isOpen ? 'Open' : 'Closed';
        establishment.dataset.status = newStatus;
        updateStatusDisplay(statusIndicator, newStatus);
    });

    if (typeof applyFilters === 'function') {
        applyFilters();
    }
}

function updateStatusDisplay(statusIndicator, status) {
    const statusText = statusIndicator.querySelector('.status-text');
    const statusDot = statusIndicator.querySelector('.dot');

    if (statusText) {
        statusText.textContent = status;
    }

    statusIndicator.classList.remove('open', 'closed');
    statusIndicator.classList.add(status.toLowerCase());

    if (statusDot) {
        if (status === 'Open') {
            statusDot.style.backgroundColor = '#10b981';
        } else {
            statusDot.style.backgroundColor = '#ef4444';
        }
    }
}

// âœ… Update statuses every minute
setInterval(updateEstablishmentStatuses, 60000);

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

// Toggle dropdown for user menu
window.toggleDropdown = function() {
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) {
        dropdown.classList.toggle("show");
    }
};

// Close dropdown if clicked outside
window.addEventListener("click", function(event) {
    const dropdown = document.getElementById("userDropdown");
    const profileImage = document.querySelector(".profile-image");
    if (dropdown && !dropdown.contains(event.target) && event.target !== profileImage) {
        dropdown.classList.remove("show");
    }
});

// Open settings modal
window.openSettingsModal = function(event) {
    event.preventDefault();
    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.style.display = "flex";
    }
};

// Close settings modal
window.closeSettingsModal = function() {
    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.style.display = "none";
    }
};

// Image Preview Function for Profile Picture
window.previewImage = function(event) {
    const input = event.target;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('profileImagePreview');
            if (preview) {
                preview.src = e.target.result;
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// Close modals on clicking outside content
window.onclick = function(event) {
    const settingsModal = document.getElementById("settingsModal");
    if (event.target === settingsModal) {
        settingsModal.style.display = "none";
    }
};

// =========================ULTRA-FAST LOCATION MAP FUNCTIONS (OPTIMIZED)==================================
document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("toggleMapBtn");
    const mapSection = document.getElementById("mapSection");

    if (!toggleBtn || !mapSection) {
        return;
    }

    let mapInitialized = false;
    let map;
    let markers = [];
    let userLocation = null;
    let routingControl = null;
    let userMarker = null;
    let watchId = null;
    let cvsuCircle = null;
    let locationAccuracyCircle = null;
    let locationButton = null;
    let isGettingLocation = false;
    let cachedLocation = null;

    const CVSU_LAT = 14.4128;
    const CVSU_LNG = 120.9813;
    const RADIUS_METERS = 500;

    toggleBtn.addEventListener("click", function () {
        mapSection.classList.toggle("active");
        toggleBtn.textContent = mapSection.classList.contains("active") ? "✖ Hide Map" : "🗺️ View Map";

        if (!mapInitialized && mapSection.classList.contains("active")) {
            if (typeof L === 'undefined') {
                console.error("Leaflet is not loaded.");
                return;
            }

            map = L.map("establishmentsMap", {
                center: [CVSU_LAT, CVSU_LNG],
                zoom: 16,
                maxZoom: 22,
                minZoom: 10,
                zoomControl: true
            });

            const highResSatellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
                attribution: "© Esri World Imagery",
                maxZoom: 22,
                maxNativeZoom: 19
            });

            const enhancedLabels = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png", {
                attribution: "© CARTO",
                maxZoom: 22,
                subdomains: 'abcd',
                pane: 'shadowPane'
            });

            const hybridGroup = L.layerGroup([highResSatellite, enhancedLabels]).addTo(map);

            const googleSatellite = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
                attribution: "© Google Satellite",
                maxZoom: 22,
                maxNativeZoom: 20
            });

            const googleHybrid = L.layerGroup([
                L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
                    maxZoom: 22,
                    maxNativeZoom: 20
                }),
                L.tileLayer("https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}", {
                    maxZoom: 22,
                    maxNativeZoom: 20
                })
            ]);

            const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
                maxZoom: 22,
                maxNativeZoom: 19
            });

            const terrainLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenTopoMap",
                maxZoom: 22,
                maxNativeZoom: 17
            });

            L.control.layers({
                "Hybrid HD (Recommended)": hybridGroup,
                "Google Hybrid": googleHybrid,
                "Google Satellite": googleSatellite,
                "Street Map": streetLayer,
                "Terrain": terrainLayer
            }).addTo(map);

            cvsuCircle = L.circle([CVSU_LAT, CVSU_LNG], {
                color: '#E9A420',
                fillColor: '#E9A420',
                fillOpacity: 0.15,
                radius: RADIUS_METERS,
                weight: 3,
                dashArray: '10, 10'
            }).addTo(map);

            cvsuCircle.bindPopup("<strong>CvSU-Bacoor Campus</strong><br>500m radius zone");

            loadEstablishments();

            const locationButtonContainer = document.createElement("div");
            locationButtonContainer.style.cssText = `
                position: absolute;
                bottom: 30px;
                right: 10px;
                z-index: 1000;
            `;

            locationButton = document.createElement("button");
            locationButton.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-location-arrow"></i>
                    <span>Show My Location</span>
                </div>
            `;
            locationButton.style.cssText = `
                background: linear-gradient(135deg, #E9A420 0%, #d89410 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(233, 164, 32, 0.4);
                transition: all 0.3s ease;
                font-family: inherit;
            `;

            locationButton.onmouseover = function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 20px rgba(233, 164, 32, 0.6)';
            };
            locationButton.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(233, 164, 32, 0.4)';
            };

            locationButton.addEventListener("click", function() {
                if (isGettingLocation) {
                    console.log("Already getting location, please wait...");
                    return;
                }

                if (!navigator.geolocation) {
                    alert("Geolocation is not supported by your browser.");
                    return;
                }

                isGettingLocation = true;

                locationButton.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Getting Location...</span>
                    </div>
                `;
                locationButton.disabled = true;
                locationButton.style.opacity = '0.7';

                if (cachedLocation) {
                    console.log("⚡ Using cached location for instant display");
                    showUserLocation(
                        cachedLocation.lat,
                        cachedLocation.lng,
                        cachedLocation.accuracy,
                        false
                    );
                    updateLocationInBackground();
                    return;
                }

                const fastOptions = {
                    enableHighAccuracy: false,
                    timeout: 3000,
                    maximumAge: 60000
                };

                const preciseOptions = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                };

                let locationShown = false;

                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        const accuracy = position.coords.accuracy;

                        userLocation = [lat, lng];
                        cachedLocation = { lat, lng, accuracy };
                        locationShown = true;

                        console.log(`⚡ Fast location: ${lat}, ${lng} (±${accuracy}m)`);
                        showUserLocation(lat, lng, accuracy, false);
                        updateLocationInBackground();
                    },
                    function(error) {
                        console.error("Fast location failed:", error.message);
                        if (!locationShown) {
                            getPreciseLocation();
                        }
                    },
                    fastOptions
                );

                function getPreciseLocation() {
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            const accuracy = position.coords.accuracy;

                            userLocation = [lat, lng];
                            cachedLocation = { lat, lng, accuracy };

                            console.log(`🎯 Precise location: ${lat}, ${lng} (±${accuracy}m)`);
                            showUserLocation(lat, lng, accuracy, true);
                        },
                        function(error) {
                            console.error("All geolocation attempts failed:", error.message);
                            handleLocationError(error);
                        },
                        preciseOptions
                    );
                }

                function updateLocationInBackground() {
                    navigator.geolocation.getCurrentPosition(
                        function(precisePosition) {
                            const lat = precisePosition.coords.latitude;
                            const lng = precisePosition.coords.longitude;
                            const accuracy = precisePosition.coords.accuracy;

                            userLocation = [lat, lng];
                            cachedLocation = { lat, lng, accuracy };

                            console.log(`🎯 Precise location updated: ${lat}, ${lng} (±${accuracy}m)`);

                            if (userMarker) {
                                showUserLocation(lat, lng, accuracy, true);
                            }
                        },
                        function(error) {
                            console.log("Background precise location failed:", error.message);
                        },
                        preciseOptions
                    );
                }
            });

            function showUserLocation(lat, lng, accuracy, isPrecise) {
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                if (locationAccuracyCircle) {
                    map.removeLayer(locationAccuracyCircle);
                }

                locationAccuracyCircle = L.circle([lat, lng], {
                    radius: accuracy,
                    fillColor: isPrecise ? "#16a34a" : "#3b82f6",
                    fillOpacity: 0.1,
                    color: isPrecise ? "#16a34a" : "#3b82f6",
                    weight: 1
                }).addTo(map);

                const pulsingIcon = L.divIcon({
                    html: `<div style="position:relative;">
                            <div style="position:absolute;width:24px;height:24px;border-radius:50%;
                                        background:${isPrecise ? '#16a34a' : '#3b82f6'};animation:pulse 2s infinite;
                                        top:50%;left:50%;transform:translate(-50%,-50%);"></div>
                            <div style="width:16px;height:16px;border-radius:50%;
                                        background:${isPrecise ? '#16a34a' : '#3b82f6'};border:3px solid #fff;
                                        box-shadow:0 2px 8px rgba(${isPrecise ? '22, 163, 74' : '59, 130, 246'}, 0.5);"></div>
                           </div>
                           <style>
                           @keyframes pulse {
                               0% { opacity:1; transform:translate(-50%,-50%) scale(1); }
                               50% { opacity:0.3; transform:translate(-50%,-50%) scale(2); }
                               100% { opacity:0; transform:translate(-50%,-50%) scale(3); }
                           }
                           </style>`,
                    className: "",
                    iconSize: [24, 24]
                });

                userMarker = L.marker([lat, lng], { icon: pulsingIcon }).addTo(map);

                const accuracyText = accuracy > 1000 ?
                    `±${(accuracy/1000).toFixed(1)}km` :
                    `±${Math.round(accuracy)}m`;

                userMarker.bindPopup(`
                    <div style="text-align:center;">
                        <strong style="color:${isPrecise ? '#16a34a' : '#3b82f6'};font-size:15px;">📍 Your Location</strong><br>
                        <small style="color:#666;">${isPrecise ? '🎯 High Precision' : '⚡ Fast Location'}</small><br>
                        <small style="color:#888;">Accuracy: ${accuracyText}</small>
                    </div>
                `);

                map.flyTo([lat, lng], 19, {
                    animate: true,
                    duration: 0.6,
                    easeLinearity: 0.3
                });

                locationButton.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-check-circle"></i>
                        <span>${isPrecise ? '🎯 Precise!' : '⚡ Located!'}</span>
                    </div>
                `;
                locationButton.style.background = `linear-gradient(135deg, ${isPrecise ? '#16a34a' : '#3b82f6'} 0%, ${isPrecise ? '#15803d' : '#2563eb'} 100%)`;
                locationButton.disabled = false;
                locationButton.style.opacity = '1';
                isGettingLocation = false;

                if (isPrecise && !watchId) {
                    watchId = navigator.geolocation.watchPosition(
                        function(position) {
                            const newLat = position.coords.latitude;
                            const newLng = position.coords.longitude;
                            const newAccuracy = position.coords.accuracy;

                            userLocation = [newLat, newLng];
                            cachedLocation = { lat: newLat, lng: newLng, accuracy: newAccuracy };

                            if (userMarker) {
                                userMarker.setLatLng([newLat, newLng]);
                            }
                            if (locationAccuracyCircle) {
                                locationAccuracyCircle.setLatLng([newLat, newLng]);
                                locationAccuracyCircle.setRadius(newAccuracy);
                            }
                        },
                        function(error) {
                            console.error("Watch position error:", error.message);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 5000
                        }
                    );
                }
            }

            function handleLocationError(error) {
                let errorMessage = "Unable to get your location.";

                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "📍 Location access denied.\n\nPlease enable location in your browser:\n1. Click the 🔒 lock icon in address bar\n2. Allow location access\n3. Refresh the page";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "📍 Location unavailable.\n\nTry:\n• Moving to an area with better signal\n• Enabling GPS on your device\n• Checking device location settings";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "⏱️ Location request timed out.\n\nPlease try again or check your:\n• Internet connection\n• GPS/Location settings";
                        break;
                }

                alert(errorMessage);

                locationButton.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-location-arrow"></i>
                        <span>Show My Location</span>
                    </div>
                `;
                locationButton.disabled = false;
                locationButton.style.opacity = '1';
                locationButton.style.background = 'linear-gradient(135deg, #E9A420 0%, #d89410 100%)';
                isGettingLocation = false;
            }

            locationButtonContainer.appendChild(locationButton);
            document.getElementById("establishmentsMap").appendChild(locationButtonContainer);

            const mapSearchContainer = document.createElement("div");
            const isMobile = window.innerWidth <= 768;

            mapSearchContainer.innerHTML = `
                <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:800;">
                    <div style="background:white;border-radius:20px;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;gap:6px;align-items:center;">
                        <div style="position:relative;flex:1;">
                            <input id="mapSearchInput" type="text" placeholder="Search establishments..."
                                style="width:${isMobile ? '200px' : '280px'};padding:8px 12px;border:none;border-radius:16px;font-size:14px;outline:none;background:transparent;" />
                        </div>
                        <button id="mapSearchBtn"
                            style="background:#E9A420;color:white;border:none;padding:8px 18px;border-radius:16px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:background 0.2s;"
                            onmouseover="this.style.background='#d89410'" onmouseout="this.style.background='#E9A420'">
                            🔍 Search
                        </button>
                    </div>
                </div>
            `;

            document.getElementById("establishmentsMap").appendChild(mapSearchContainer);

            const searchInput = document.getElementById("mapSearchInput");
            const searchBtn = document.getElementById("mapSearchBtn");

            function performSearch() {
                const query = searchInput.value.trim().toLowerCase();
                if (!query) {
                    markers.forEach(m => {
                        if (m.marker._icon) {
                            m.marker._icon.style.display = '';
                        }
                    });
                    return;
                }

                let found = false;
                markers.forEach(m => {
                    const matches = m.name.includes(query);
                    if (m.marker._icon) {
                        m.marker._icon.style.display = matches ? '' : 'none';
                    }
                    if (matches && !found) {
                        map.setView([m.lat, m.lng], 19, {
                            animate: true,
                            duration: 0.8
                        });
                        m.marker.fire('click');
                        found = true;
                    }
                });

                if (!found) {
                    alert(`No results found for "${query}"`);
                }
            }

            searchBtn.addEventListener("click", performSearch);
            searchInput.addEventListener("keypress", function(e) {
                if (e.key === "Enter") {
                    performSearch();
                }
            });

            mapInitialized = true;
        }
    });

    function loadEstablishments() {
        const items = document.querySelectorAll(".food-establishment-item");
        let bounds = [];

        items.forEach(item => {
            const name = item.getAttribute("data-name");
            const lat = parseFloat(item.getAttribute("data-lat"));
            const lng = parseFloat(item.getAttribute("data-lng"));
            const imageEl = item.querySelector(".food-image");
            const image = imageEl ? imageEl.src : "";

            const linkEl = item.querySelector('a[href*="establishment"]');
            let establishmentId = '';
            if (linkEl) {
                const href = linkEl.getAttribute('href');
                const matches = href.match(/establishment\/(\d+)/);
                if (matches && matches[1]) {
                    establishmentId = matches[1];
                }
            }

            if (!isNaN(lat) && !isNaN(lng)) {
                const icon = L.divIcon({
                    html: `<div style="width:48px;height:48px;border-radius:50%;overflow:hidden;border:3px solid #E9A420;box-shadow: 0 3px 10px rgba(0,0,0,0.4);cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                            <img src="${image}" style="width:100%;height:100%;object-fit:cover;">
                           </div>`,
                    className: "",
                    iconSize: [48, 48]
                });

                const marker = L.marker([lat, lng], { icon }).addTo(map);

                marker.on('click', function() {
                    let popupText = `<div style="text-align:center;min-width:200px;"><strong style="font-size:15px;color:#111;">${name}</strong>`;

                    if (userLocation) {
                        const distance = map.distance(userLocation, [lat, lng]);
                        const meters = Math.round(distance);
                        const km = (distance / 1000).toFixed(2);

                        if (meters < 1000) {
                            popupText += `<br><span style="font-size:13px;color:#16a34a;font-weight:600;">📍 ${meters}m from you</span>`;
                        } else {
                            popupText += `<br><span style="font-size:13px;color:#16a34a;font-weight:600;">📍 ${km}km from you</span>`;
                        }

                        if (typeof L.Routing !== 'undefined') {
                            if (routingControl) {
                                map.removeControl(routingControl);
                            }

                            routingControl = L.Routing.control({
                                waypoints: [
                                    L.latLng(userLocation[0], userLocation[1]),
                                    L.latLng(lat, lng)
                                ],
                                routeWhileDragging: false,
                                addWaypoints: false,
                                draggableWaypoints: false,
                                fitSelectedRoutes: true,
                                showAlternatives: true,
                                altLineOptions: {
                                    styles: [
                                        { color: '#888', opacity: 0.5, weight: 4 },
                                        { color: '#ccc', opacity: 0.3, weight: 6 }
                                    ]
                                },
                                lineOptions: {
                                    styles: [
                                        { color: '#E9A420', opacity: 0.8, weight: 6 },
                                        { color: '#fff', opacity: 0.4, weight: 9 }
                                    ]
                                },
                                createMarker: function() { return null; },
                                show: false
                            }).on('routesfound', function(e) {
                                const routes = e.routes;
                                const mainRoute = routes[0];
                                const distanceKm = (mainRoute.summary.totalDistance / 1000).toFixed(2);
                                const timeMin = Math.round(mainRoute.summary.totalTime / 60);

                                const updatedPopupText = `<div style="text-align:center;min-width:200px;">
                                    <strong style="font-size:15px;color:#111;">${name}</strong><br>
                                    <span style="font-size:13px;color:#16a34a;font-weight:600;">📍 ${distanceKm} km away</span><br>
                                    <span style="font-size:12px;color:#666;">🕒 About ${timeMin} minutes</span><br>
                                    <a href="/food_establishment/${establishmentId}/"
                                       style="display:inline-block;margin-top:10px;padding:8px 16px;background-color:#E9A420;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(233,164,32,0.3);">
                                       View Details →
                                    </a></div>`;

                                marker.getPopup().setContent(updatedPopupText);
                            }).addTo(map);
                        }
                    }

                    popupText += `<br><a href="/food_establishment/${establishmentId}/"
                       style="display:inline-block;margin-top:10px;padding:8px 16px;background-color:#E9A420;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(233,164,32,0.3);">
                       View Details →
                    </a></div>`;

                    marker.bindPopup(popupText, {
                        maxWidth: 300,
                        className: 'custom-popup'
                    }).openPopup();

                    map.setView([lat, lng], 19, {
                        animate: true,
                        duration: 0.8,
                        easeLinearity: 0.5
                    });
                });

                markers.push({
                    name: (name || '').toLowerCase(),
                    marker: marker,
                    lat: lat,
                    lng: lng,
                    id: establishmentId
                });
                bounds.push([lat, lng]);
            }
        });

        if (bounds.length > 0) {
            if (userLocation) {
                bounds.push(userLocation);
            }
            map.fitBounds(bounds, { padding: [60, 60] });
        }
    }
});

// ============================================
// Profile Update Form Handler
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileUpdateForm');

    if (profileForm) {
        profileForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const formData = new FormData(profileForm);

            fetch(UPDATE_PROFILE_URL, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Profile updated successfully!');
                    closeSettingsModal();

                    const profileImages = document.querySelectorAll('.profile-image');
                    if (data.profile_picture_url) {
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

    function toggleScrollButton() {
        if (!scrollBtn) return;

        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollPosition > 300) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    }

    function scrollToTop(e) {
        e.preventDefault();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function init() {
        scrollBtn = document.getElementById('scrollToTopBtn');

        if (!scrollBtn) {
            console.error('❌ Scroll to top button not found in DOM');
            return;
        }

        console.log('✅ Scroll to top button initialized');

        window.addEventListener('scroll', throttle(toggleScrollButton, 100), { passive: true });

        scrollBtn.addEventListener('click', scrollToTop);

        toggleScrollButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();/* ==========================================
   BEST SELLERS JAVASCRIPT - FINAL VERSION
   With login redirect for unauthenticated users
   ========================================== */

const BestSellers = {
    items: [],
    isLoading: false,
    scrollContainer: null,
    scrollPosition: 0,

    init() {
        console.log('Initializing Best Sellers...');
        this.scrollContainer = document.getElementById('bestSellersScroll');

        if (!this.scrollContainer) {
            console.error('Best Sellers scroll container not found');
            return;
        }

        this.setupScrollButtons();
        this.loadBestSellers();

        setInterval(() => this.loadBestSellers(), 300000);
        setInterval(() => this.updateAllStatuses(), 60000);
    },

    setupScrollButtons() {
        const leftBtn = document.getElementById('scrollLeftBtn');
        const rightBtn = document.getElementById('scrollRightBtn');

        if (!leftBtn || !rightBtn) {
            console.error('Scroll buttons not found');
            return;
        }

        leftBtn.addEventListener('click', () => {
            this.scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
        });

        rightBtn.addEventListener('click', () => {
            this.scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
        });

        this.scrollContainer.addEventListener('scroll', () => {
            this.updateScrollButtons();
        });

        this.updateScrollButtons();
    },

    updateScrollButtons() {
        const leftBtn = document.getElementById('scrollLeftBtn');
        const rightBtn = document.getElementById('scrollRightBtn');

        if (!leftBtn || !rightBtn || !this.scrollContainer) return;

        const scrollLeft = this.scrollContainer.scrollLeft;
        const maxScroll = this.scrollContainer.scrollWidth - this.scrollContainer.clientWidth;

        leftBtn.disabled = scrollLeft <= 0;
        rightBtn.disabled = scrollLeft >= maxScroll - 1;
    },

    isEstablishmentOpen(openingTime, closingTime) {
        if (!openingTime || !closingTime) return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [openHour, openMin] = openingTime.split(':').map(Number);
        const [closeHour, closeMin] = closingTime.split(':').map(Number);

        const openingMinutes = openHour * 60 + openMin;
        const closingMinutes = closeHour * 60 + closeMin;

        if (openingMinutes <= closingMinutes) {
            return currentTime >= openingMinutes && currentTime <= closingMinutes;
        } else {
            return currentTime >= openingMinutes || currentTime <= closingMinutes;
        }
    },

    updateAllStatuses() {
        document.querySelectorAll('.best-seller-card').forEach(card => {
            const statusBadge = card.querySelector('.establishment-status');
            if (!statusBadge) return;

            const openingTime = statusBadge.dataset.openingTime;
            const closingTime = statusBadge.dataset.closingTime;

            const isOpen = this.isEstablishmentOpen(openingTime, closingTime);

            statusBadge.className = `establishment-status ${isOpen ? 'open' : 'closed'}`;
            statusBadge.textContent = isOpen ? 'Open' : 'Closed';
        });
    },

    async loadBestSellers() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const response = await fetch('/api/best-sellers/');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.items && data.items.length > 0) {
                this.items = data.items;

                // ✅ CRITICAL: Preload ALL images BEFORE rendering
                console.log("🖼️ Preloading images...");
                await preloadBestSellerImages(data.items);
                console.log("✅ All images preloaded!");
                this.renderBestSellers();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading best sellers:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    },

    showLoading() {
        if (!this.scrollContainer) return;

        this.scrollContainer.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading best sellers...</p>
            </div>
        `;
    },

    showEmptyState() {
        if (!this.scrollContainer) return;

        this.scrollContainer.innerHTML = `
            <div class="no-best-sellers">
                <i class="fas fa-box-open"></i>
                <h3>No Best Sellers Yet</h3>
                <p>Check back soon for popular items!</p>
            </div>
        `;
    },

    showError() {
        if (!this.scrollContainer) return;

        this.scrollContainer.innerHTML = `
            <div class="no-best-sellers">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Unable to Load Best Sellers</h3>
                <p>Please try again later</p>
            </div>
        `;
    },

    renderBestSellers() {
        if (!this.scrollContainer || !this.items.length) return;

        this.scrollContainer.innerHTML = this.items.map(item => this.createItemCard(item)).join('');

        this.attachEventListeners();

        setTimeout(() => this.updateScrollButtons(), 100);
    },

    createItemCard(item) {
        const establishment = item.establishment;

        const openingTime = establishment.opening_time || '';
        const closingTime = establishment.closing_time || '';

        const isOpen = this.isEstablishmentOpen(openingTime, closingTime);
        const isAvailable = item.is_available && isOpen;

        return `
            <div class="best-seller-card" data-item-id="${item.id}" data-establishment-id="${establishment.id}">
                ${item.is_top_seller ? `
                    <div class="best-seller-badge">
                        <i class="fas fa-star"></i>
                        Best Seller
                    </div>
                ` : ''}

                <img
                    src="${item.image_url || '/static/images/placeholder-food.jpg'}"
                    alt="${this.escapeHtml(item.name)}"
                    class="best-seller-image"
                    loading="eager"
                    onerror="this.src='/static/images/placeholder-food.jpg'"
                />

                <div class="best-seller-content">
                    <h3 class="best-seller-name">${this.escapeHtml(item.name)}</h3>
                    <div class="best-seller-price">₱${item.price.toFixed(2)}</div>

                    <div class="best-seller-stats">
                        <div class="stat-item">
                            <i class="fas fa-shopping-bag"></i>
                            <strong>${item.total_orders}</strong> orders
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-box"></i>
                            <strong>${item.quantity}</strong> left
                        </div>
                    </div>

                    <div class="best-seller-establishment">
                        <img
                            src="${establishment.image_url || '/static/images/placeholder-store.jpg'}"
                            alt="${this.escapeHtml(establishment.name)}"
                            class="establishment-logo"
                            loading="eager"
                            onerror="this.src='/static/images/placeholder-store.jpg'"
                        />
                        <div class="establishment-info">
                            <div class="establishment-name">${this.escapeHtml(establishment.name)}</div>
                            <div class="establishment-category">
                                ${this.escapeHtml(establishment.category)} •
                                <span class="establishment-status ${isOpen ? 'open' : 'closed'}"
                                      data-opening-time="${openingTime}"
                                      data-closing-time="${closingTime}">
                                    ${isOpen ? 'Open' : 'Closed'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="best-seller-actions">
                        <button class="view-item-btn" data-action="view">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                        ${isAvailable ? `
                            <button class="add-to-cart-btn" data-action="add-to-cart" title="Add to Cart">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        document.querySelectorAll('.best-seller-card .view-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.best-seller-card');
                const establishmentId = card.dataset.establishmentId;
                this.viewEstablishment(establishmentId);
            });
        });

        // ✅ ADD TO CART WITH LOGIN CHECK
        document.querySelectorAll('.best-seller-card .add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                // ✅ CHECK IF USER IS AUTHENTICATED
                const isAuthenticated = typeof IS_USER_AUTHENTICATED !== 'undefined' && IS_USER_AUTHENTICATED;

                if (!isAuthenticated) {
                    // ✅ NOT LOGGED IN - REDIRECT TO LOGIN
                    this.showToast('Please login to add items to cart', 'info');
                    setTimeout(() => {
                        window.location.href = '/accounts/login_register/';
                    }, 1000);
                    return;
                }

                // ✅ LOGGED IN - ADD TO CART
                const card = e.target.closest('.best-seller-card');
                const itemId = card.dataset.itemId;
                const establishmentId = card.dataset.establishmentId;
                this.addToCart(itemId, establishmentId);
            });
        });

        document.querySelectorAll('.best-seller-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const establishmentId = card.dataset.establishmentId;
                this.viewEstablishment(establishmentId);
            });
        });
    },

    viewEstablishment(establishmentId) {
        if (!establishmentId) return;
        window.location.href = `/food_establishment/${establishmentId}/`;
    },

    async addToCart(itemId, establishmentId) {
        if (!itemId || !establishmentId) return;

        try {
            const response = await fetch('/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    menu_item_id: itemId,
                    establishment_id: establishmentId,
                    quantity: 1
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Item added to cart!', 'success');

                if (typeof updateCartCount === 'function') {
                    updateCartCount();
                }
            } else {
                this.showToast(data.message || 'Failed to add item to cart', 'error');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showToast('Error adding item to cart', 'error');
        }
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const bgColor = type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1';

        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${bgColor};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 600;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    },

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Best Sellers...');
    setTimeout(() => BestSellers.init(), 500);
});

window.addEventListener('load', function() {
    if (!BestSellers.scrollContainer) {
        console.log('Retrying Best Sellers initialization...');
        BestSellers.init();
    }
});

// Animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);/* ==========================================
   🔥 AUTOMATIC BEST SELLERS SYSTEM
   Add this to kabsueats.js
   ========================================== */

const AutomaticBestSellers = {
    items: [],
    isLoading: false,
    scrollContainer: null,
    updateInterval: null,
    statusInterval: null,

    // ✅ Initialize the system
    init() {
        console.log('🔥 Initializing Automatic Best Sellers System...');
        this.scrollContainer = document.getElementById('bestSellersScroll');

        if (!this.scrollContainer) {
            console.error('❌ Best Sellers scroll container not found');
            return;
        }

        this.setupScrollButtons();
        this.loadBestSellers();

        // ✅ Auto-refresh every 5 minutes (300000ms)
        this.updateInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing best sellers...');
            this.loadBestSellers();
        }, 300000);

        // ✅ Update status every minute (60000ms)
        this.statusInterval = setInterval(() => {
            this.updateAllStatuses();
        }, 60000);

        console.log('✅ Automatic Best Sellers initialized successfully!');
    },

    // ✅ Setup scroll buttons
    setupScrollButtons() {
        const leftBtn = document.getElementById('scrollLeftBtn');
        const rightBtn = document.getElementById('scrollRightBtn');

        if (!leftBtn || !rightBtn) {
            console.error('❌ Scroll buttons not found');
            return;
        }

        leftBtn.addEventListener('click', () => {
            this.scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
        });

        rightBtn.addEventListener('click', () => {
            this.scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
        });

        this.scrollContainer.addEventListener('scroll', () => {
            this.updateScrollButtons();
        });

        this.updateScrollButtons();
    },

    // ✅ Update scroll button states
    updateScrollButtons() {
        const leftBtn = document.getElementById('scrollLeftBtn');
        const rightBtn = document.getElementById('scrollRightBtn');

        if (!leftBtn || !rightBtn || !this.scrollContainer) return;

        const scrollLeft = this.scrollContainer.scrollLeft;
        const maxScroll = this.scrollContainer.scrollWidth - this.scrollContainer.clientWidth;

        leftBtn.disabled = scrollLeft <= 0;
        rightBtn.disabled = scrollLeft >= maxScroll - 1;
    },

    // ✅ Check if establishment is open based on current time
    isEstablishmentOpen(openingTime, closingTime) {
        if (!openingTime || !closingTime) return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [openHour, openMin] = openingTime.split(':').map(Number);
        const [closeHour, closeMin] = closingTime.split(':').map(Number);

        const openingMinutes = openHour * 60 + openMin;
        const closingMinutes = closeHour * 60 + closeMin;

        if (openingMinutes <= closingMinutes) {
            // Normal hours (e.g., 8:00 AM - 10:00 PM)
            return currentTime >= openingMinutes && currentTime <= closingMinutes;
        } else {
            // Overnight hours (e.g., 10:00 PM - 2:00 AM)
            return currentTime >= openingMinutes || currentTime <= closingMinutes;
        }
    },

    // ✅ Update all status badges in real-time
    updateAllStatuses() {
        document.querySelectorAll('.best-seller-card').forEach(card => {
            const statusBadge = card.querySelector('.establishment-status');
            if (!statusBadge) return;

            const openingTime = statusBadge.dataset.openingTime;
            const closingTime = statusBadge.dataset.closingTime;

            const isOpen = this.isEstablishmentOpen(openingTime, closingTime);

            statusBadge.className = `establishment-status ${isOpen ? 'open' : 'closed'}`;
            statusBadge.textContent = isOpen ? 'Open' : 'Closed';
        });
    },

    // ✅ Load best sellers from API
    async loadBestSellers() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const response = await fetch('/api/best-sellers/');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.items && data.items.length > 0) {
                console.log(`✅ Loaded ${data.items.length} best sellers`);
                this.items = data.items;

                // ✅ CRITICAL: Preload ALL images BEFORE rendering
                console.log("🖼️ Preloading images...");
                await preloadBestSellerImages(data.items);
                console.log("✅ All images preloaded!");
                this.renderBestSellers();
            } else {
                console.log('ℹ️ No best sellers found');
                this.showEmptyState();
            }
        } catch (error) {
            console.error('❌ Error loading best sellers:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    },

    // ✅ Show loading state
    showLoading() {
        if (!this.scrollContainer) return;

        this.scrollContainer.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading best sellers...</p>
            </div>
        `;
    },

    // ✅ Show empty state
    showEmptyState() {
        if (!this.scrollContainer) return;

        this.scrollContainer.innerHTML = `
            <div class="no-best-sellers">
                <i class="fas fa-box-open"></i>
                <h3>No Best Sellers Yet</h3>
                <p>Check back soon for popular items!</p>
            </div>
        `;
    },

    // ✅ Show error state
    showError() {
        if (!this.scrollContainer) return;

        this.scrollContainer.innerHTML = `
            <div class="no-best-sellers">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Unable to Load Best Sellers</h3>
                <p>Please try again later</p>
            </div>
        `;
    },

    // ✅ Render best sellers
    renderBestSellers() {
        if (!this.scrollContainer || !this.items.length) return;

        this.scrollContainer.innerHTML = this.items.map(item => this.createItemCard(item)).join('');

        this.attachEventListeners();

        setTimeout(() => this.updateScrollButtons(), 100);
    },

    // ✅ Create individual item card
    createItemCard(item) {
        const establishment = item.establishment;

        const openingTime = establishment.opening_time || '';
        const closingTime = establishment.closing_time || '';

        const isOpen = this.isEstablishmentOpen(openingTime, closingTime);
        const isAvailable = item.is_available && isOpen;

        return `
            <div class="best-seller-card" data-item-id="${item.id}" data-establishment-id="${establishment.id}">
                ${item.is_top_seller ? `
                    <div class="best-seller-badge">
                        <i class="fas fa-star"></i>
                        Best Seller
                    </div>
                ` : ''}

                <img
                    src="${item.image_url || '/static/images/placeholder-food.jpg'}"
                    alt="${this.escapeHtml(item.name)}"
                    class="best-seller-image"
                    loading="eager"
                    onerror="this.src='/static/images/placeholder-food.jpg'"
                />

                <div class="best-seller-content">
                    <h3 class="best-seller-name">${this.escapeHtml(item.name)}</h3>
                    <div class="best-seller-price">₱${item.price.toFixed(2)}</div>

                    <div class="best-seller-stats">
                        <div class="stat-item">
                            <i class="fas fa-shopping-bag"></i>
                            <strong>${item.total_orders}</strong> orders
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-box"></i>
                            <strong>${item.quantity}</strong> left
                        </div>
                    </div>

                    <div class="best-seller-establishment">
                        <img
                            src="${establishment.image_url || '/static/images/placeholder-store.jpg'}"
                            alt="${this.escapeHtml(establishment.name)}"
                            class="establishment-logo"
                            loading="eager"
                            onerror="this.src='/static/images/placeholder-store.jpg'"
                        />
                        <div class="establishment-info">
                            <div class="establishment-name">${this.escapeHtml(establishment.name)}</div>
                            <div class="establishment-category">
                                ${this.escapeHtml(establishment.category)} •
                                <span class="establishment-status ${isOpen ? 'open' : 'closed'}"
                                      data-opening-time="${openingTime}"
                                      data-closing-time="${closingTime}">
                                    ${isOpen ? 'Open' : 'Closed'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="best-seller-actions">
                        <button class="view-item-btn" data-action="view">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                        ${isAvailable ? `
                            <button class="add-to-cart-btn" data-action="add-to-cart" title="Add to Cart">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // ✅ Attach event listeners
    attachEventListeners() {
        // View details buttons
        document.querySelectorAll('.best-seller-card .view-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.best-seller-card');
                const establishmentId = card.dataset.establishmentId;
                this.viewEstablishment(establishmentId);
            });
        });

        // Add to cart buttons with authentication check
        document.querySelectorAll('.best-seller-card .add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                // Check if user is authenticated
                const isAuthenticated = typeof IS_USER_AUTHENTICATED !== 'undefined' && IS_USER_AUTHENTICATED;

                if (!isAuthenticated) {
                    this.showToast('Please login to add items to cart', 'info');
                    setTimeout(() => {
                        window.location.href = '/accounts/login_register/';
                    }, 1000);
                    return;
                }

                const card = e.target.closest('.best-seller-card');
                const itemId = card.dataset.itemId;
                const establishmentId = card.dataset.establishmentId;
                this.addToCart(itemId, establishmentId);
            });
        });

        // Card click - view establishment
        document.querySelectorAll('.best-seller-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const establishmentId = card.dataset.establishmentId;
                this.viewEstablishment(establishmentId);
            });
        });
    },

    // ✅ Navigate to establishment details
    viewEstablishment(establishmentId) {
        if (!establishmentId) return;
        window.location.href = `/food_establishment/${establishmentId}/`;
    },

    // ✅ Add item to cart
    async addToCart(itemId, establishmentId) {
        if (!itemId || !establishmentId) return;

        try {
            const response = await fetch('/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({
                    menu_item_id: itemId,
                    establishment_id: establishmentId,
                    quantity: 1
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Item added to cart!', 'success');

                if (typeof updateCartCount === 'function') {
                    updateCartCount();
                }
            } else {
                this.showToast(data.message || 'Failed to add item to cart', 'error');
            }
        } catch (error) {
            console.error('❌ Error adding to cart:', error);
            this.showToast('Error adding item to cart', 'error');
        }
    },

    // ✅ Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const bgColor = type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1';

        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${bgColor};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 600;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ✅ Get CSRF token
    getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    },

    // ✅ Escape HTML to prevent XSS
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    // ✅ Cleanup on page unload
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
    }
};

// ✅ Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, initializing Automatic Best Sellers...');
    setTimeout(() => AutomaticBestSellers.init(), 500);
});

// ✅ Backup initialization
window.addEventListener('load', function() {
    if (!AutomaticBestSellers.scrollContainer) {
        console.log('🔄 Retrying Automatic Best Sellers initialization...');
        AutomaticBestSellers.init();
    }
});

// ✅ Cleanup on page unload
window.addEventListener('beforeunload', function() {
    AutomaticBestSellers.destroy();
});

// ✅ Add required CSS animations
const bestSellersStyle = document.createElement('style');
bestSellersStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(bestSellersStyle);