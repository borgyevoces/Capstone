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

// =========================ENHANCED MAP WITH ACCURATE GEOLOCATION==================================
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
    let isTrackingLocation = false;

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

            // Load establishments immediately
            loadEstablishments();

            // ========== CREATE "SHOW MY LOCATION" BUTTON ==========
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
                if (!this.disabled) {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 6px 20px rgba(233, 164, 32, 0.6)';
                }
            };
            locationButton.onmouseout = function() {
                if (!this.disabled) {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 4px 15px rgba(233, 164, 32, 0.4)';
                }
            };

            // ========== BUTTON CLICK EVENT - HIGH ACCURACY GEOLOCATION ==========
            locationButton.addEventListener("click", function() {
                if (!navigator.geolocation) {
                    alert("❌ Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Safari.");
                    return;
                }

                if (isTrackingLocation) {
                    // Stop tracking
                    stopLocationTracking();
                    return;
                }

                // Start tracking
                startLocationTracking();
            });

            function startLocationTracking() {
                isTrackingLocation = true;

                locationButton.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Getting Location...</span>
                    </div>
                `;
                locationButton.disabled = true;
                locationButton.style.opacity = '0.7';

                // CRITICAL: High accuracy geolocation options
                const geoOptions = {
                    enableHighAccuracy: true,  // Use GPS if available
                    timeout: 30000,            // 30 seconds timeout
                    maximumAge: 0              // Always get fresh location
                };

                // Get initial position
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        const userLat = position.coords.latitude;
                        const userLng = position.coords.longitude;
                        const accuracy = position.coords.accuracy;
                        userLocation = [userLat, userLng];

                        console.log(`✅ Initial location: ${userLat.toFixed(6)}, ${userLng.toFixed(6)} (±${accuracy.toFixed(1)}m)`);

                        updateUserMarker(userLat, userLng, accuracy);

                        // Zoom to user location
                        map.setView(userLocation, 19, {
                            animate: true,
                            duration: 1.2,
                            easeLinearity: 0.5
                        });

                        // Update button to show tracking is active
                        locationButton.innerHTML = `
                            <div style="display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-crosshairs" style="animation: spin 2s linear infinite;"></i>
                                <span>Tracking Active</span>
                            </div>
                        `;
                        locationButton.disabled = false;
                        locationButton.style.opacity = '1';
                        locationButton.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';

                        // Start continuous tracking
                        watchId = navigator.geolocation.watchPosition(
                            function (position) {
                                const userLat = position.coords.latitude;
                                const userLng = position.coords.longitude;
                                const accuracy = position.coords.accuracy;
                                userLocation = [userLat, userLng];

                                console.log(`📍 Updated: ${userLat.toFixed(6)}, ${userLng.toFixed(6)} (±${accuracy.toFixed(1)}m)`);

                                updateUserMarker(userLat, userLng, accuracy);
                            },
                            function (error) {
                                console.error("❌ Watch position error:", error.message);
                                handleLocationError(error);
                            },
                            geoOptions
                        );
                    },
                    function (error) {
                        console.error("❌ Initial geolocation error:", error.message);
                        handleLocationError(error);
                        stopLocationTracking();
                    },
                    geoOptions
                );
            }

            function updateUserMarker(lat, lng, accuracy) {
                // Remove existing markers
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                if (locationAccuracyCircle) {
                    map.removeLayer(locationAccuracyCircle);
                }

                // Add accuracy circle (shows GPS accuracy)
                locationAccuracyCircle = L.circle([lat, lng], {
                    radius: accuracy,
                    fillColor: "#3b82f6",
                    fillOpacity: 0.1,
                    color: "#3b82f6",
                    weight: 1,
                    className: 'accuracy-circle'
                }).addTo(map);

                // Create highly visible pulsing marker
                const pulsingIcon = L.divIcon({
                    html: `
                        <div style="position:relative;width:24px;height:24px;">
                            <div class="pulse-ring" style="
                                position:absolute;
                                width:40px;
                                height:40px;
                                border-radius:50%;
                                background:rgba(59, 130, 246, 0.4);
                                top:50%;
                                left:50%;
                                transform:translate(-50%,-50%);
                                animation:pulse-expand 2s infinite;
                            "></div>
                            <div style="
                                position:absolute;
                                width:24px;
                                height:24px;
                                border-radius:50%;
                                background:#3b82f6;
                                border:4px solid #fff;
                                box-shadow:0 3px 15px rgba(59, 130, 246, 0.7);
                                top:50%;
                                left:50%;
                                transform:translate(-50%,-50%);
                                z-index:10;
                            "></div>
                            <div style="
                                position:absolute;
                                width:8px;
                                height:8px;
                                border-radius:50%;
                                background:#fff;
                                top:50%;
                                left:50%;
                                transform:translate(-50%,-50%);
                                z-index:11;
                            "></div>
                        </div>
                        <style>
                        @keyframes pulse-expand {
                            0% { opacity:1; transform:translate(-50%,-50%) scale(0.5); }
                            50% { opacity:0.4; transform:translate(-50%,-50%) scale(1.5); }
                            100% { opacity:0; transform:translate(-50%,-50%) scale(2); }
                        }
                        </style>
                    `,
                    className: "user-location-marker",
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                // Add user marker
                userMarker = L.marker([lat, lng], {
                    icon: pulsingIcon,
                    zIndexOffset: 1000
                }).addTo(map);

                const accuracyText = accuracy < 20 ?
                    `<span style="color:#16a34a;">Excellent (±${Math.round(accuracy)}m)</span>` :
                    accuracy < 50 ?
                    `<span style="color:#f59e0b;">Good (±${Math.round(accuracy)}m)</span>` :
                    `<span style="color:#ef4444;">Fair (±${Math.round(accuracy)}m)</span>`;

                userMarker.bindPopup(`
                    <div style="text-align:center;min-width:180px;">
                        <strong style="color:#3b82f6;font-size:15px;">📍 Your Current Location</strong><br>
                        <small style="color:#666;font-size:12px;">
                            GPS Accuracy: ${accuracyText}<br>
                            Lat: ${lat.toFixed(6)}<br>
                            Lng: ${lng.toFixed(6)}
                        </small>
                    </div>
                `);
            }

            function stopLocationTracking() {
                if (watchId) {
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                }

                isTrackingLocation = false;

                locationButton.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-location-arrow"></i>
                        <span>Show My Location</span>
                    </div>
                `;
                locationButton.disabled = false;
                locationButton.style.opacity = '1';
                locationButton.style.background = 'linear-gradient(135deg, #E9A420 0%, #d89410 100%)';

                console.log("🛑 Location tracking stopped");
            }

            function handleLocationError(error) {
                let errorMessage = "";

                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "❌ Location access denied. Please enable location permissions in your browser settings.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "❌ Location information is unavailable. Please check if location services are enabled on your device.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "❌ Location request timed out. Please try again.";
                        break;
                    default:
                        errorMessage = "❌ An unknown error occurred while getting your location.";
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
            }

            locationButtonContainer.appendChild(locationButton);
            document.getElementById("establishmentsMap").appendChild(locationButtonContainer);

            // ========== CENTERED SEARCH BAR ==========
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

    // Function to load establishments
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
                        const dist = map.distance(userLocation, [lat, lng]);
                        const m = Math.round(dist);
                        const km = (dist / 1000).toFixed(2);
                        popup += `<br><span style="color:#16a34a;font-weight:600;">📍 ${m < 1000 ? m + 'm' : km + 'km'} away</span>`;

                        if (typeof L.Routing !== 'undefined') {
                            if (routingControl) map.removeControl(routingControl);
                            routingControl = L.Routing.control({
                                waypoints: [L.latLng(userLocation[0], userLocation[1]), L.latLng(lat, lng)],
                                routeWhileDragging: false,
                                addWaypoints: false,
                                show: false,
                                createMarker: () => null
                            }).addTo(map);
                        }
                    }

                    popup += `<br><a href="/food_establishment/${estId}/" style="display:inline-block;margin-top:10px;padding:8px 16px;
                                    background:#E9A420;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;
                                    box-shadow:0 2px 6px rgba(233,164,32,0.3);">View Details →</a></div>`;

                    marker.bindPopup(popup, {maxWidth: 300}).openPopup();
                    map.setView([lat, lng], 19, {animate: true, duration: 0.8});
                });

                markers.push({name: (name || '').toLowerCase(), marker, lat, lng, id: estId});
                bounds.push([lat, lng]);
            }
        });

        if (bounds.length > 0) {
            if (userLocation) bounds.push(userLocation);
            map.fitBounds(bounds, {padding: [60, 60]});
        }
    }
});

// Profile Update
document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileUpdateForm');
    if (!profileForm) return;

    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(profileForm);

        fetch(UPDATE_PROFILE_URL, {
            method: 'POST',
            body: formData,
            headers: {'X-CSRFToken': formData.get('csrfmiddlewaretoken')}
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert('Profile updated!');
                closeSettingsModal();
                if (data.profile_picture_url) {
                    document.querySelectorAll('.profile-image').forEach(img => img.src = data.profile_picture_url);
                }
            } else {
                alert('Error: ' + (data.errors || 'Unknown'));
            }
        })
        .catch(err => {
            console.error(err);
            alert('Unexpected error');
        });
    });
});

// Cart Functions
window.addToCart = function(itemId, quantity, csrfToken, buttonElement = null, itemName = 'Item', action = 'add') {
    return new Promise((resolve, reject) => {
        if (typeof IS_USER_AUTHENTICATED === 'undefined' || !IS_USER_AUTHENTICATED) {
            if (confirm("You must log in to order. Go to Login page?")) {
                if(typeof LOGIN_REGISTER_URL !== 'undefined') window.location.href = LOGIN_REGISTER_URL;
            }
            return reject(new Error("Not authenticated"));
        }

        if (buttonElement) {
            buttonElement.dataset.originalText = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        }

        fetch(ADD_TO_CART_URL, {
            method: 'POST',
            headers: {'X-CSRFToken': csrfToken, 'Content-Type': 'application/json'},
            body: JSON.stringify({'menu_item_id': itemId, 'quantity': quantity})
        })
        .then(r => {
            if (r.status === 409) {
                return r.json().then(data => {
                    if (data.error_type === 'DIFFERENT_ESTABLISHMENT' && confirm(data.message)) {
                        return window.addToCart(itemId, quantity, csrfToken, buttonElement, itemName, 'replace');
                    }
                    throw new Error(data.message || "Error");
                });
            }
            if (!r.ok) throw new Error('Network error');
            return r.json();
        })
        .then(data => {
            if (data.success) {
                if (typeof updateCartBadge === 'function') updateCartBadge(data.cart_count);
                alert(data.message);
                if (buttonElement?.dataset.action === 'buy_now' && typeof VIEW_CART_URL !== 'undefined') {
                    window.location.href = VIEW_CART_URL;
                }
                resolve();
            } else {
                alert(`Failed: ${data.message}`);
                reject(new Error(data.message));
            }
        })
        .catch(err => {
            if (err.message !== "Cart operation cancelled by user.") alert(`Error: ${err.message}`);
            reject(err);
        })
        .finally(() => {
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = buttonElement.dataset.originalText || '<i class="fas fa-cart-plus"></i> Add to Cart';
            }
        });
    });
};

// Scroll to Top
(function() {
    let scrollBtn = null;

    function toggleBtn() {
        if (!scrollBtn) return;
        const scroll = window.pageYOffset || document.documentElement.scrollTop;
        scrollBtn.classList.toggle('show', scroll > 300);
    }

    function init() {
        scrollBtn = document.getElementById('scrollToTopBtn');
        if (!scrollBtn) return;
        window.addEventListener('scroll', () => toggleBtn(), {passive: true});
        scrollBtn.onclick = e => {
            e.preventDefault();
            window.scrollTo({top: 0, behavior: 'smooth'});
        };
        toggleBtn();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();