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

// Toggle dropdown for user menu (KabsuEats project)
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

// Open settings modal (KabsuEats project)
window.openSettingsModal = function(event) {
    event.preventDefault();
    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.style.display = "flex";
    }
};

// Close settings modal (KabsuEats project)
window.closeSettingsModal = function() {
    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.style.display = "none";
    }
};

// ====== NEW: Image Preview Function for Profile Picture ======
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

// =========================ENHANCED MAP FUNCTIONS (MODIFIED WITH BUTTON)==================================
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
    let locationButton = null; // NEW: Button reference
    let establishmentsLoaded = false; // NEW: Track if establishments are shown

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

            // ========== NEW: FUNCTION TO LOAD ESTABLISHMENTS ==========
            function loadEstablishments() {
                if (establishmentsLoaded) return; // Prevent loading twice

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

                                    routingControl.on('routingerror', function(e) {
                                        console.error('Routing error:', e);
                                        alert('Could not calculate route. Please try again.');
                                    });
                                } else {
                                    popupText += `<div style="margin-top:10px;padding:8px;background:#fef2f2;border-radius:6px;font-size:12px;color:#991b1b;">
                                        ⚠️ Routing library not loaded
                                    </div>`;
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
                    // If user location exists, include it in bounds
                    if (userLocation) {
                        bounds.push(userLocation);
                    }
                    map.fitBounds(bounds, { padding: [60, 60] });
                }

                establishmentsLoaded = true;
            }

            // ========== NEW: CREATE LOCATION BUTTON ==========
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

            // Hover effects
            locationButton.onmouseover = function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 20px rgba(233, 164, 32, 0.6)';
            };
            locationButton.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(233, 164, 32, 0.4)';
            };

            // ========== NEW: BUTTON CLICK EVENT TO GET LOCATION ==========
            locationButton.addEventListener("click", function() {
                if (!navigator.geolocation) {
                    alert("Geolocation is not supported by your browser.");
                    return;
                }

                // Change button to loading state
                locationButton.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Getting Location...</span>
                    </div>
                `;
                locationButton.disabled = true;
                locationButton.style.opacity = '0.7';

                const geoOptions = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                };

                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        const userLat = position.coords.latitude;
                        const userLng = position.coords.longitude;
                        const accuracy = position.coords.accuracy;
                        userLocation = [userLat, userLng];

                        console.log(`Location accuracy: ${accuracy} meters`);

                        // Remove existing markers and circles
                        if (userMarker) {
                            map.removeLayer(userMarker);
                        }
                        if (locationAccuracyCircle) {
                            map.removeLayer(locationAccuracyCircle);
                        }

                        // Add accuracy circle
                        locationAccuracyCircle = L.circle(userLocation, {
                            radius: accuracy,
                            fillColor: "#007bff",
                            fillOpacity: 0.1,
                            color: "#007bff",
                            weight: 1
                        }).addTo(map);

                        // Create pulsing icon
                        const pulsingIcon = L.divIcon({
                            html: `<div style="position:relative;">
                                    <div style="position:absolute;width:24px;height:24px;border-radius:50%;
                                                background:#007bff;animation:pulse 2s infinite;
                                                top:50%;left:50%;transform:translate(-50%,-50%);"></div>
                                    <div style="width:16px;height:16px;border-radius:50%;
                                                background:#007bff;border:3px solid #fff;
                                                box-shadow:0 2px 8px rgba(0,123,255,0.5);"></div>
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

                        // Add user marker
                        userMarker = L.marker(userLocation, { icon: pulsingIcon }).addTo(map);

                        userMarker.bindPopup(`
                            <div style="text-align:center;">
                                <strong style="color:#007bff;">📍 Your Location</strong><br>
                                <small>Accuracy: ±${Math.round(accuracy)}m</small>
                            </div>
                        `);

                        // Zoom to user location
                        map.setView(userLocation, 19, {
                            animate: true,
                            duration: 1.2,
                            easeLinearity: 0.5
                        });

                        // ========== NEW: LOAD ESTABLISHMENTS AFTER LOCATION IS FOUND ==========
                        setTimeout(() => {
                            loadEstablishments();
                        }, 500);

                        // Update button to success state
                        locationButton.innerHTML = `
                            <div style="display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-check-circle"></i>
                                <span>Location Found!</span>
                            </div>
                        `;
                        locationButton.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';

                        // Start watching position for real-time updates
                        if (watchId) {
                            navigator.geolocation.clearWatch(watchId);
                        }

                        watchId = navigator.geolocation.watchPosition(
                            function (position) {
                                const userLat = position.coords.latitude;
                                const userLng = position.coords.longitude;
                                const accuracy = position.coords.accuracy;
                                userLocation = [userLat, userLng];

                                if (userMarker) {
                                    userMarker.setLatLng(userLocation);
                                }
                                if (locationAccuracyCircle) {
                                    locationAccuracyCircle.setLatLng(userLocation);
                                    locationAccuracyCircle.setRadius(accuracy);
                                }
                            },
                            function (error) {
                                console.error("Watch position error:", error.message);
                            },
                            geoOptions
                        );
                    },
                    function (error) {
                        console.error("Geolocation error:", error.message);
                        alert("Unable to get your location. Please enable location services.");

                        // Reset button to original state
                        locationButton.innerHTML = `
                            <div style="display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-location-arrow"></i>
                                <span>Show My Location</span>
                            </div>
                        `;
                        locationButton.disabled = false;
                        locationButton.style.opacity = '1';
                        locationButton.style.background = 'linear-gradient(135deg, #E9A420 0%, #d89410 100%)';
                    },
                    geoOptions
                );
            });

            locationButtonContainer.appendChild(locationButton);
            document.getElementById("establishmentsMap").appendChild(locationButtonContainer);

            // COMPACT SEARCH BAR - REDUCED HEIGHT, NO OVERLAP
            const mapSearchContainer = document.createElement("div");
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                // Phone view search bar
                mapSearchContainer.innerHTML = `
                    <div style="position:absolute;top:10px;left:10px;right:10px;z-index:800;">
                        <div style="background:white;border-radius:18px;padding:4px;box-shadow:0 2px 6px rgba(0,0,0,0.15);display:flex;gap:4px;align-items:center;">
                            <div style="position:relative;flex:1;">
                                <input id="mapSearchInput" type="text" placeholder="Search..."
                                    style="width:100%;padding:6px 10px;border:none;border-radius:14px;font-size:13px;outline:none;background:transparent;" />
                            </div>
                            <button id="mapSearchBtn"
                                style="background:#E9A420;color:white;border:none;padding:6px 14px;border-radius:14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
                                🔍 Search
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // Desktop view search bar
                mapSearchContainer.innerHTML = `
                    <div style="position:absolute;top:10px;left:60px;z-index:800;">
                        <div style="background:white;border-radius:20px;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;gap:6px;align-items:center;">
                            <div style="position:relative;flex:1;">
                                <input id="mapSearchInput" type="text" placeholder="Search establishments..."
                                    style="width:280px;padding:8px 12px;border:none;border-radius:16px;font-size:14px;outline:none;background:transparent;" />
                            </div>
                            <button id="mapSearchBtn"
                                style="background:#E9A420;color:white;border:none;padding:8px 18px;border-radius:16px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:background 0.2s;"
                                onmouseover="this.style.background='#d89410'" onmouseout="this.style.background='#E9A420'">
                                🔍 Search
                            </button>
                        </div>
                    </div>
                `;
            }

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

            // ========== LOAD ESTABLISHMENTS IMMEDIATELY ON MAP OPEN ==========
            loadEstablishments();

            mapInitialized = true;
        }
    });
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

                    // Update profile picture in header if changed
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