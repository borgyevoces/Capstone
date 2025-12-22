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
    const settingsModal = document.getElementById("settingsModal");
    if (event.target === settingsModal) {
        settingsModal.style.display = "none";
    }
};

// =========================✅ FIXED MAP WITH AUTO-OPEN AND REAL-TIME LOCATION==================================
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
    let establishmentsLoaded = false;

    // ✅ Soldiers Hills IV coordinates (from your screenshot)
    const INITIAL_CENTER_LAT = 14.4246;
    const INITIAL_CENTER_LNG = 120.9644;
    const INITIAL_ZOOM = 16;

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

            // ✅ Initialize map centered on Soldiers Hills IV
            map = L.map("establishmentsMap", {
                center: [INITIAL_CENTER_LAT, INITIAL_CENTER_LNG],
                zoom: INITIAL_ZOOM,
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

            // ========== ✅ FUNCTION TO LOAD ESTABLISHMENTS ==========
            function loadEstablishments() {
                if (establishmentsLoaded) return;

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
                                                { color: '#16a34a', opacity: 0.8, weight: 6 },
                                                { color: '#22c55e', opacity: 0.5, weight: 8 }
                                            ]
                                        }
                                    }).addTo(map);
                                }
                            }

                            if (establishmentId) {
                                popupText += `<br><a href="/kabsueats/establishment/${establishmentId}/" style="display:inline-block;margin-top:8px;padding:6px 16px;background:#E9A420;color:white;text-decoration:none;border-radius:20px;font-size:12px;font-weight:600;transition:background 0.2s;" onmouseover="this.style.background='#d89410'" onmouseout="this.style.background='#E9A420'">View Details</a>`;
                            }

                            popupText += `</div>`;
                            marker.bindPopup(popupText).openPopup();
                        });

                        markers.push({ marker, lat, lng, name: name.toLowerCase() });
                        bounds.push([lat, lng]);
                    }
                });

                establishmentsLoaded = true;
                console.log(`✅ Loaded ${markers.length} establishments on map`);
            }

            // ✅ IMMEDIATELY LOAD ESTABLISHMENTS ON MAP INITIALIZATION
            setTimeout(() => {
                loadEstablishments();
            }, 500);

            // ========== ✅ "SHOW MY LOCATION" BUTTON WITH REAL-TIME TRACKING ==========
            const locationButtonContainer = document.createElement("div");
            locationButtonContainer.style.cssText = "position:absolute;bottom:30px;right:30px;z-index:1000;";

            locationButton = document.createElement("button");
            locationButton.style.cssText = `
                padding: 12px 20px;
                background: linear-gradient(135deg, #E9A420 0%, #d89410 100%);
                color: white;
                border: none;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(233, 164, 32, 0.4);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            locationButton.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-location-arrow"></i>
                    <span>Show My Location</span>
                </div>
            `;

            locationButton.onmouseover = function() {
                if (!this.disabled) {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 6px 20px rgba(233, 164, 32, 0.6)';
                }
            };

            locationButton.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 12px rgba(233, 164, 32, 0.4)';
            };

            const geoOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            locationButton.addEventListener("click", function () {
                if (!navigator.geolocation) {
                    alert("Geolocation is not supported by your browser.");
                    return;
                }

                locationButton.disabled = true;
                locationButton.style.opacity = '0.7';
                locationButton.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Getting Location...</span>
                    </div>
                `;

                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        const userLat = position.coords.latitude;
                        const userLng = position.coords.longitude;
                        const accuracy = position.coords.accuracy;

                        userLocation = [userLat, userLng];

                        // ✅ CREATE/UPDATE USER MARKER
                        const userIcon = L.divIcon({
                            html: `<div style="width:24px;height:24px;border-radius:50%;background:#2196F3;border:4px solid white;box-shadow: 0 2px 8px rgba(0,0,0,0.4);position:relative;">
                                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;background:white;border-radius:50%;"></div>
                                   </div>`,
                            className: "",
                            iconSize: [24, 24]
                        });

                        if (userMarker) {
                            map.removeLayer(userMarker);
                        }
                        userMarker = L.marker(userLocation, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
                        userMarker.bindPopup(`<div style="text-align:center;"><strong style="color:#2196F3;">You are here</strong><br><small>Accuracy: ±${Math.round(accuracy)} meters</small></div>`);

                        // ✅ ACCURACY CIRCLE
                        if (locationAccuracyCircle) {
                            map.removeLayer(locationAccuracyCircle);
                        }
                        locationAccuracyCircle = L.circle(userLocation, {
                            radius: accuracy,
                            color: '#2196F3',
                            fillColor: '#2196F3',
                            fillOpacity: 0.1,
                            weight: 1
                        }).addTo(map);

                        // ✅ CENTER MAP ON USER LOCATION
                        map.setView(userLocation, 19, {
                            animate: true,
                            duration: 1.2,
                            easeLinearity: 0.5
                        });

                        // Update button to success state
                        locationButton.innerHTML = `
                            <div style="display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-crosshairs"></i>
                                <span>Tracking Location</span>
                            </div>
                        `;
                        locationButton.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                        locationButton.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.4)';
                        locationButton.disabled = false;
                        locationButton.style.opacity = '1';

                        // ✅ START REAL-TIME POSITION TRACKING
                        if (watchId) {
                            navigator.geolocation.clearWatch(watchId);
                        }

                        watchId = navigator.geolocation.watchPosition(
                            function (position) {
                                const newLat = position.coords.latitude;
                                const newLng = position.coords.longitude;
                                const newAccuracy = position.coords.accuracy;
                                userLocation = [newLat, newLng];

                                // Update marker position
                                if (userMarker) {
                                    userMarker.setLatLng(userLocation);
                                    userMarker.setPopupContent(`<div style="text-align:center;"><strong style="color:#2196F3;">You are here</strong><br><small>Accuracy: ±${Math.round(newAccuracy)} meters</small></div>`);
                                }

                                // Update accuracy circle
                                if (locationAccuracyCircle) {
                                    locationAccuracyCircle.setLatLng(userLocation);
                                    locationAccuracyCircle.setRadius(newAccuracy);
                                }

                                console.log(`📍 Location updated: ${newLat}, ${newLng} (±${Math.round(newAccuracy)}m)`);
                            },
                            function (error) {
                                console.error("Watch position error:", error.message);
                            },
                            geoOptions
                        );
                    },
                    function (error) {
                        console.error("Geolocation error:", error.message);
                        let errorMsg = "Unable to get your location. ";

                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                errorMsg += "Please enable location permissions.";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMsg += "Location information is unavailable.";
                                break;
                            case error.TIMEOUT:
                                errorMsg += "Location request timed out.";
                                break;
                            default:
                                errorMsg += "An unknown error occurred.";
                        }

                        alert(errorMsg);

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

            // COMPACT SEARCH BAR
            const mapSearchContainer = document.createElement("div");
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
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

            mapInitialized = true;
            console.log("✅ Map initialized successfully");
        }

        // Resize map when toggled
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        }
    });
});

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
})();