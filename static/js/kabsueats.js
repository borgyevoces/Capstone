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

// Profile Modal Logic
const showProfileModalButton = document.getElementById('showProfileModal');
const profileModal = document.getElementById('profileModal');
const cancelProfileButton = document.getElementById('cancelProfile');

function showProfileModal() {
    if (profileModal) {
        profileModal.classList.remove('opacity-0', 'pointer-events-none');
        profileModal.classList.add('opacity-100');
        const modalContent = profileModal.querySelector('div');
        if (modalContent) {
            modalContent.classList.remove('-translate-y-4', 'scale-95');
            modalContent.classList.add('translate-y-0', 'scale-100');
        }
    }
}

function hideProfileModal() {
    if (profileModal) {
        profileModal.classList.remove('opacity-100');
        profileModal.classList.add('opacity-0', 'pointer-events-none');
        const modalContent = profileModal.querySelector('div');
        if (modalContent) {
            modalContent.classList.remove('translate-y-0', 'scale-100');
            modalContent.classList.add('-translate-y-4', 'scale-95');
        }
    }
}

if (showProfileModalButton) showProfileModalButton.addEventListener('click', showProfileModal);
if (cancelProfileButton) cancelProfileButton.addEventListener('click', hideProfileModal);

if (profileModal) {
    profileModal.addEventListener('click', (event) => {
        if (event.target === profileModal) {
            hideProfileModal();
        }
    });
}

function previewImage(event) {
    const input = event.target;
    const reader = new FileReader();
    reader.onload = function(){
        const output = document.getElementById('profileImagePreview');
        const defaultIcon = document.getElementById('profileDefaultIcon');
        if (output) {
            output.src = reader.result;
            output.style.display = 'block';
            if (defaultIcon) {
                defaultIcon.style.display = 'none';
            }
        } else {
            const profileImageContainer = document.querySelector('.w-24.h-24');
            if (profileImageContainer) {
                profileImageContainer.innerHTML = `<img id="profileImagePreview" src="${reader.result}" alt="Profile Picture" class="w-full h-full object-cover">`;
                if (defaultIcon) {
                    defaultIcon.style.display = 'none';
                }
            }
        }
    };
    if (input.files[0]) {
        reader.readAsDataURL(input.files[0]);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const messages = document.querySelectorAll('.message');
    if (messages.length > 0) {
        messages.forEach((msg, index) => {
            setTimeout(() => {
                msg.classList.add('show');
            }, 200 * (index + 1));

            setTimeout(() => {
                msg.classList.remove('show');
            }, 5000 + (200 * (index + 1)));
        });
    }
});

// =========================ENHANCED MAP FUNCTIONS (FIXED - NO OVERLAP)==================================
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
                                            { color: '#fff', opacity: 0.8, weight: 2 }
                                        ]
                                    },
                                    lineOptions: {
                                        styles: [
                                            { color: '#E9A420', opacity: 0.9, weight: 6 },
                                            { color: '#FFF', opacity: 0.8, weight: 4 }
                                        ]
                                    },
                                    createMarker: () => null,
                                    router: L.Routing.osrmv1({
                                        serviceUrl: 'https://router.project-osrm.org/route/v1',
                                        profile: 'foot'
                                    }),
                                    formatter: new L.Routing.Formatter({
                                        units: 'metric',
                                        unitNames: {
                                            meters: 'm',
                                            kilometers: 'km',
                                            yards: 'yd',
                                            miles: 'mi',
                                            hours: 'h',
                                            minutes: 'min',
                                            seconds: 's'
                                        }
                                    }),
                                    summaryTemplate: '<div style="padding:10px;background:#f8f9fa;border-radius:8px;margin:10px 0;">' +
                                                    '<h4 style="margin:0 0 8px 0;color:#E9A420;">🚶 Best Walking Route</h4>' +
                                                    '<div style="font-size:13px;color:#333;">' +
                                                    '<strong>Distance:</strong> {distance}<br>' +
                                                    '<strong>Est. Time:</strong> {time}' +
                                                    '</div></div>',
                                    containerClassName: 'routing-container-custom'
                                }).addTo(map);

                                routingControl.on('routesfound', function(e) {
                                    const routes = e.routes;
                                    const bestRoute = routes[0];
                                    const distance = (bestRoute.summary.totalDistance / 1000).toFixed(2);
                                    const time = Math.round(bestRoute.summary.totalTime / 60);

                                    console.log(`Best route: ${distance}km, ~${time} minutes`);

                                    let updatedPopupText = `<div style="text-align:center;min-width:200px;"><strong style="font-size:15px;color:#111;">${name}</strong>`;

                                    if (meters < 1000) {
                                        updatedPopupText += `<br><span style="font-size:13px;color:#16a34a;font-weight:600;">📍 ${meters}m from you</span>`;
                                    } else {
                                        updatedPopupText += `<br><span style="font-size:13px;color:#16a34a;font-weight:600;">📍 ${km}km from you</span>`;
                                    }

                                    updatedPopupText += `
                                        <div style="margin-top:10px;padding:8px;background:#f0fdf4;border-radius:6px;border:1px solid #86efac;">
                                            <div style="font-size:12px;color:#166534;">
                                                <strong>🎯 Best Route Found</strong><br>
                                                ${distance} km • ~${time} min walk
                                            </div>
                                        </div>
                                    `;

                                    // ==========================================================
                                    // ===== ⬇️ FIX #1: IDINAGDAG ANG 'food_' PREFIX ⬇️ =====
                                    // ==========================================================
                                    updatedPopupText += `<br><a href="/food_establishment/${establishmentId}/"
                                       style="display:inline-block;margin-top:10px;padding:8px 16px;background-color:#E9A420;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(233,164,32,0.3);">
                                       View Details →
                                    </a></div>`;

                                    marker.getPopup().setContent(updatedPopupText);
                                });

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

                        // ==========================================================
                        // ===== ⬇️ FIX #2: IDINAGDAG ANG 'food_' PREFIX ⬇️ =====
                        // ==========================================================
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
                map.fitBounds(bounds, { padding: [60, 60] });
            }

            if (navigator.geolocation) {
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

                        if (userMarker) {
                            map.removeLayer(userMarker);
                        }
                        if (locationAccuracyCircle) {
                            map.removeLayer(locationAccuracyCircle);
                        }

                        locationAccuracyCircle = L.circle(userLocation, {
                            radius: accuracy,
                            fillColor: "#007bff",
                            fillOpacity: 0.1,
                            color: "#007bff",
                            weight: 1
                        }).addTo(map);

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

                        userMarker = L.marker(userLocation, { icon: pulsingIcon }).addTo(map);

                        userMarker.bindPopup(`
                            <div style="text-align:center;">
                                <strong style="color:#007bff;">📍 Your Location</strong><br>
                                <small>Accuracy: ±${Math.round(accuracy)}m</small>
                            </div>
                        `);

                        map.setView(userLocation, 19, {
                            animate: true,
                            duration: 1.2,
                            easeLinearity: 0.5
                        });

                        bounds.push(userLocation);
                        setTimeout(() => {
                            map.fitBounds(bounds, {
                                padding: [80, 80],
                                maxZoom: 17
                            });
                        }, 2000);
                    },
                    function (error) {
                        console.error("Geolocation error:", error.message);
                        alert("Unable to get your location. Please enable location services.");
                    },
                    geoOptions
                );

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
            } else {
                alert("Geolocation is not supported by your browser.");
            }

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
                                    style="width:100%;padding:6px 10px;border:none;outline:none;border-radius:14px;font-size:12px;background:#f9fafb;box-sizing:border-box;height:28px;">
                                <div id="searchSuggestions" style="display:none;position:absolute;top:calc(100% + 6px);left:0;
                                                                   background:white;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);
                                                                   width:100%;max-height:140px;overflow-y:auto;z-index:1000;"></div>
                            </div>
                            <button id="mapSearchBtn"
                                style="padding:6px 12px;border-radius:14px;background-color:#E9A420;color:white;border:none;
                                       cursor:pointer;font-weight:600;font-size:12px;white-space:nowrap;flex-shrink:0;height:28px;line-height:1;"
                                       onmouseover="this.style.backgroundColor='#d4951c'"
                                       onmouseout="this.style.backgroundColor='#E9A420'">
                                🔍
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // *** UPDATED ***
                // DESKTOP LAYOUT - Inilipat ang search bar sa pinakataas (top: 10px)
                mapSearchContainer.innerHTML = `
                    <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:800;">
                        <div style="display:flex;gap:6px;box-shadow:0 3px 10px rgba(0,0,0,0.2);border-radius:22px;background:white;padding:5px;">
                            <div style="position:relative;flex:1;">
                                <input id="mapSearchInput" type="text" placeholder="Search establishments..."
                                    style="padding:8px 18px;border:none;outline:none;border-radius:18px;width:280px;font-size:13px;height:32px;box-sizing:border-box;">
                                <div id="searchSuggestions" style="display:none;position:absolute;top:40px;left:0;
                                                                   background:white;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);
                                                                   width:100%;max-height:180px;overflow-y:auto;z-index:1000;"></div>
                            </div>
                            <button id="mapSearchBtn"
                                style="padding:8px 18px;border-radius:18px;background-color:#E9A420;color:white;border:none;
                                       cursor:pointer;font-weight:600;font-size:13px;height:32px;line-height:1;"
                                       onmouseover="this.style.backgroundColor='#d4951c'"
                                       onmouseout="this.style.backgroundColor='#E9A420'">
                                🔍 Search
                            </button>
                        </div>
                    </div>
                `;
            }
            document.getElementById("establishmentsMap").appendChild(mapSearchContainer);

            const searchInput = document.getElementById("mapSearchInput");
            const searchBtn = document.getElementById("mapSearchBtn");
            const suggestionsDiv = document.getElementById("searchSuggestions");

            // Autocomplete functionality
            searchInput.addEventListener("input", function() {
                const query = this.value.toLowerCase().trim();

                if (query.length < 2) {
                    suggestionsDiv.style.display = 'none';
                    return;
                }

                const matches = markers.filter(m => m.name.includes(query));

                if (matches.length > 0) {
                    suggestionsDiv.innerHTML = matches.slice(0, 5).map(m =>
                        `<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #eee;transition:background 0.2s;font-size:12px;"
                              onmouseover="this.style.backgroundColor='#f3f4f6'"
                              onmouseout="this.style.backgroundColor='white'"
                              onclick="document.getElementById('mapSearchInput').value='${m.name}';
                                       document.getElementById('searchSuggestions').style.display='none';
                                       document.getElementById('mapSearchBtn').click();">
                            🍽️ ${m.name.charAt(0).toUpperCase() + m.name.slice(1)}
                         </div>`
                    ).join('');
                    suggestionsDiv.style.display = 'block';
                } else {
                    suggestionsDiv.style.display = 'none';
                }
            });

            // Close suggestions when clicking outside
            document.addEventListener('click', function(e) {
                if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                    suggestionsDiv.style.display = 'none';
                }
            });

            function performSearch() {
                const query = searchInput.value.toLowerCase().trim();
                if (!query) {
                    alert("Please enter a search term.");
                    return;
                }

                const found = markers.find(m => m.name.includes(query));
                if (found) {
                    // Trigger marker click to show route
                    found.marker.fire('click');
                    searchInput.value = '';
                    suggestionsDiv.style.display = 'none';
                } else {
                    alert(`"${query}" not found. Try another search term.`);
                }
            }

            searchInput.addEventListener("keypress", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    performSearch();
                }
            });

            searchBtn.addEventListener("click", performSearch);

            setTimeout(() => {
                map.invalidateSize();
            }, 100);

            mapInitialized = true;
        } else if (mapInitialized) {
            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        }
    });
});

/* =======================================================
   PROFILE DROPDOWN & SETTINGS
   ======================================================= */
function toggleDropdown() {
    const dropdown = document.getElementById("userDropdown");
    if (dropdown) {
        dropdown.classList.toggle("show");
    }
}

function openSettingsModal(event) {
    if(event) event.preventDefault();

    const dropdown = document.getElementById("userDropdown");
    if (dropdown) {
        dropdown.classList.remove("show");
    }

    const modal = document.getElementById("settingsModal");
    if (modal) {
        if (window.getComputedStyle(modal).display === 'flex') {
             modal.style.display = "flex";
        } else {
             modal.style.display = "block";
        }
    }
}

function closeSettingsModal() {
    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.style.display = "none";
    }
}

window.onclick = function(event) {
    if (event.target && !event.target.matches('.profile-image')) {
        var dropdowns = document.getElementsByClassName("dropdown-menu");
        for (let i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }

    const modal = document.getElementById("settingsModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// AJAX form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('profileUpdateForm');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(form);
            if (typeof UPDATE_PROFILE_URL === 'undefined') {
                console.error('UPDATE_PROFILE_URL is not defined.');
                return;
            }
            const url = UPDATE_PROFILE_URL;

            fetch(url, {
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
                    const profileImage = document.querySelector('.profile-image');
                    if (profileImage && data.profile_picture_url) {
                        profileImage.src = data.profile_picture_url + '?' + new Date().getTime();
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