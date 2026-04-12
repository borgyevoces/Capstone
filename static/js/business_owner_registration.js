/* ============================================================
   KABSU EATS – BUSINESS OWNER REGISTRATION (FULL 3-STEP FLOW)
   ✅ FIXED: OTP Modal now shows properly with CSRF token
   ✅ FIXED: English validation messages & tightened gibberish detection
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('register/location')) initStep1();
    else if (path.includes('register/details')) initStep2();
    else if (path.includes('register/credentials')) initStep3();
});

/* ============================================================
   HELPER: Get CSRF Token from Cookies
   ============================================================ */
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

/* ============================================================
   STEP 1 – LOCATION PINNING WITH INTEGRATED FEATURES
   ============================================================ */
function initStep1() {
    const nextBtn = document.getElementById('next-step-btn');
    const msg = document.getElementById('validation-message');

    const cvsuLatLng = [CVSU_COORDS.lat, CVSU_COORDS.lng];
    const RADIUS = 500;

    // --- CLEAN MAP LAYER (NO RED OVERLAY) ---
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
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
        "Street Map": streetLayer,
        "Satellite": satelliteLayer,
        "Terrain": terrainLayer
    };

    const map = L.map('map', {
        layers: [hybridLayer],  // Default to hybrid map
        maxZoom: 21,
        minZoom: 10
    }).setView(cvsuLatLng, 16);

    window.map = map;
    L.control.layers(baseMaps).addTo(map);

    // CvSU center marker - proper landmark building icon
    L.marker(cvsuLatLng, {
        icon: L.divIcon({
            className: '',
            html: `<div style="
                position: relative;
                width: 52px;
                height: 52px;
            ">
                <!-- Outer ring pulse -->
                <div style="
                    position: absolute;
                    top: -6px; left: -6px;
                    width: 64px; height: 64px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.25);
                    border: 2px solid rgba(255,255,255,0.6);
                    animation: cvsuPulse 2s ease-in-out infinite;
                "></div>
                <!-- Main circle -->
                <div style="
                    width: 52px; height: 52px;
                    border-radius: 50%;
                    background: linear-gradient(145deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
                    border: 3px solid #fff;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <!-- University/building SVG icon -->
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
                    </svg>
                </div>
                <!-- Label below -->
                <div style="
                    position: absolute;
                    bottom: -22px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(15,52,96,0.92);
                    color: white;
                    font-size: 9px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    white-space: nowrap;
                    letter-spacing: 0.5px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                ">CvSU-Bacoor</div>
            </div>
            <style>
                @keyframes cvsuPulse {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.15); opacity: 0.3; }
                }
            </style>`,
            iconSize: [52, 74],
            iconAnchor: [26, 26]
        })
    }).addTo(map).bindPopup('<div style="text-align:center;padding:4px 8px;"><strong style="color:#0f3460;">CvSU-Bacoor Campus</strong><br><small style="color:#666;">Cavite State University</small></div>');

    // Subtle light boundary circle (very transparent)
    L.circle(cvsuLatLng, {
        color: '#2196F3',          // Blue border
        fillColor: '#E3F2FD',      // Very light blue fill
        fillOpacity: 0.15,         // Very transparent - establishments clearly visible
        weight: 2,                 // Thin border
        radius: RADIUS
    }).addTo(map);

    // Show existing registered establishments on map with photo markers
    if (typeof EXISTING_ESTABLISHMENTS !== 'undefined' && EXISTING_ESTABLISHMENTS) {
        EXISTING_ESTABLISHMENTS.forEach(est => {
            if (est.latitude && est.longitude) {
                const isOpen = (est.status || '').toLowerCase() === 'open';
                const borderColor = isOpen ? '#10b981' : '#ef4444';

                // Build inner content: photo or initial fallback
                let innerHtml;
                if (est.image_url) {
                    innerHtml = `
                        <img src="${est.image_url}"
                            style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"
                            onerror="this.style.display='none';this.nextSibling.style.display='flex';">
                        <div style="display:none;width:100%;height:100%;border-radius:50%;
                            background:linear-gradient(135deg,#FF6B6B,#FF5252);color:#fff;
                            font-size:16px;font-weight:700;align-items:center;justify-content:center;">
                            ${est.name.charAt(0).toUpperCase()}
                        </div>`;
                } else {
                    innerHtml = `
                        <div style="width:100%;height:100%;border-radius:50%;
                            background:linear-gradient(135deg,#FF6B6B,#FF5252);color:#fff;
                            font-size:16px;font-weight:700;display:flex;
                            align-items:center;justify-content:center;">
                            ${est.name.charAt(0).toUpperCase()}
                        </div>`;
                }

                const estIcon = L.divIcon({
                    className: '',
                    html: `<div style="
                        width:48px;height:48px;border-radius:50%;
                        border:3px solid ${borderColor};
                        box-shadow:0 3px 12px rgba(0,0,0,0.4);
                        overflow:hidden;cursor:pointer;
                        background:#fff;position:relative;">
                        ${innerHtml}
                        <div style="
                            position:absolute;bottom:-1px;right:-1px;
                            width:14px;height:14px;border-radius:50%;
                            background:${isOpen ? '#10b981' : '#ef4444'};
                            border:2px solid #fff;">
                        </div>
                    </div>`,
                    iconSize: [48, 48],
                    iconAnchor: [24, 24],
                    popupAnchor: [0, -28]
                });

                const marker = L.marker([est.latitude, est.longitude], {
                    icon: estIcon
                }).addTo(map);

                // Rich popup with photo banner
                const popupImg = est.image_url
                    ? `<div style="width:100%;height:80px;border-radius:6px;overflow:hidden;margin-bottom:8px;">
                         <img src="${est.image_url}" style="width:100%;height:100%;object-fit:cover;"
                              onerror="this.parentElement.style.display='none'">
                       </div>` : '';

                const statusBadge = `<span style="
                    display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;
                    background:${isOpen ? '#dcfce7' : '#fee2e2'};
                    color:${isOpen ? '#166534' : '#991b1b'};">
                    ${isOpen ? '● Open' : '● Closed'}
                </span>`;

                marker.bindPopup(`
                    <div style="font-family:sans-serif;min-width:200px;max-width:230px;">
                        ${popupImg}
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;">
                            <strong style="color:#111827;font-size:13px;line-height:1.3;">${est.name}</strong>
                            ${statusBadge}
                        </div>
                        <div style="font-size:11px;color:#6b7280;margin-top:3px;">
                            <i style="color:#B71C1C;">📍</i> ${est.address || 'Near CvSU-Bacoor'}
                        </div>
                        ${est.category__name ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">🏷️ ${est.category__name}</div>` : ''}
                    </div>
                `);
            }
        });
    }

    // Add markers for all registered establishments
    if (typeof REGISTERED_ESTABLISHMENTS !== 'undefined' && REGISTERED_ESTABLISHMENTS.length > 0) {
        REGISTERED_ESTABLISHMENTS.forEach(establishment => {
            if (establishment.latitude && establishment.longitude) {
                const estIcon = L.divIcon({
                    className: 'establishment-marker',
                    html: `
                        <div style="position: relative;">
                            <svg width="30" height="38" viewBox="0 0 30 38" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                                <path d="M15 0 C 8 0 3 5 3 12 C 3 21 15 38 15 38 S 27 21 27 12 C 27 5 22 0 15 0 Z"
                                      fill="#4CAF50" stroke="white" stroke-width="1.5"/>
                                <circle cx="15" cy="12" r="4" fill="white"/>
                            </svg>
                        </div>
                    `,
                    iconSize: [30, 38],
                    iconAnchor: [15, 38],
                    popupAnchor: [0, -38]
                });

                const marker = L.marker([establishment.latitude, establishment.longitude], {
                    icon: estIcon
                }).addTo(map);

                // Create popup with establishment info
                const popupContent = `
                    <div style="min-width: 150px;">
                        <strong style="font-size: 14px; color: #333;">${establishment.name}</strong><br>
                        <span style="font-size: 12px; color: #666;">${establishment.category__name || 'Restaurant'}</span><br>
                        <span style="font-size: 11px; color: #999;">${establishment.address || 'Near CvSU'}</span>
                    </div>
                `;
                marker.bindPopup(popupContent);
            }
        });
    }

    map.on('click', (e) => {
        const distance = map.distance(e.latlng, cvsuLatLng);
        if (distance <= RADIUS) {
            if (window.userMarker) {
                window.userMarker.setLatLng(e.latlng);
            } else {
                window.userMarker = L.marker(e.latlng, {
                    draggable: true,
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }).addTo(map);

                window.userMarker.on('dragend', (evt) => {
                    const pos = evt.target.getLatLng();
                    const dist = map.distance(pos, cvsuLatLng);
                    if (dist <= RADIUS) {
                        validatePosition(pos);
                    } else {
                        msg.textContent = '❌ Please pin inside the circle (within 500m).';
                        msg.className = 'map-validation-message invalid';
                        nextBtn.disabled = true;
                        updateRemovePinButton(false);
                    }
                });
            }
            validatePosition(e.latlng);
        } else {
            msg.textContent = '❌ Please pin inside the circle (within 500m).';
            msg.className = 'map-validation-message invalid';
            nextBtn.disabled = true;
        }
    });

    function validatePosition(pos) {
        sessionStorage.setItem('latitude', pos.lat);
        sessionStorage.setItem('longitude', pos.lng);
        msg.textContent = '✓ Location pinned successfully!';
        msg.className = 'map-validation-message valid';
        nextBtn.disabled = false;
        updateRemovePinButton(true);

        const locationInfo = document.getElementById('location-info');
        const locationCoords = document.getElementById('location-coords');
        if (locationInfo && locationCoords) {
            locationCoords.textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
            locationInfo.classList.add('show');
        }
    }

    function updateRemovePinButton(hasPinned) {
        const removePinBtn = document.getElementById('remove-pin-btn');
        if (hasPinned) {
            removePinBtn.classList.add('active');
        } else {
            removePinBtn.classList.remove('active');
        }
    }

    nextBtn.addEventListener('click', () => {
        window.location.href = '/owner/register/details/';
    });

    // Search functionality
    const searchInput = document.getElementById('location-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
    const focusCvsuBtn = document.getElementById('focus-cvsu-btn');
    const useCurrentLocationBtn = document.getElementById('use-current-location-btn');
    const removePinBtn = document.getElementById('remove-pin-btn');
    const locationStatus = document.getElementById('location-status');

    const cvsuLatLngObj = L.latLng(CVSU_COORDS.lat, CVSU_COORDS.lng);
    let searchTimeout;
    let currentSelectedIndex = -1;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            clearSearchBtn.classList.add('show');
        } else {
            clearSearchBtn.classList.remove('show');
            autocompleteDropdown.classList.remove('show');
            autocompleteDropdown.innerHTML = '';
            return;
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query);
            }
        }, 300);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('show');
        autocompleteDropdown.classList.remove('show');
        autocompleteDropdown.innerHTML = '';
        searchInput.focus();
    });

    function performSearch(query) {
        autocompleteDropdown.innerHTML = '<div class="autocomplete-loading"><span class="spinner"></span>Searching...</div>';
        autocompleteDropdown.classList.add('show');

        const viewbox = `${cvsuLatLngObj.lng - 0.01},${cvsuLatLngObj.lat + 0.01},${cvsuLatLngObj.lng + 0.01},${cvsuLatLngObj.lat - 0.01}`;

        // Create a combined results array
        let allResults = [];

        // First, search in existing establishments from database
        if (typeof EXISTING_ESTABLISHMENTS !== 'undefined' && EXISTING_ESTABLISHMENTS) {
            const lowerQuery = query.toLowerCase();
            const establishmentMatches = EXISTING_ESTABLISHMENTS.filter(est => {
                const nameMatch = est.name && est.name.toLowerCase().includes(lowerQuery);
                const addressMatch = est.address && est.address.toLowerCase().includes(lowerQuery);
                return nameMatch || addressMatch;
            }).map(est => ({
                type: 'establishment',
                lat: est.latitude,
                lon: est.longitude,
                display_name: est.name,
                address: est.address,
                name: est.name,
                isEstablishment: true
            }));

            allResults = [...establishmentMatches];
        }

        // Then fetch from Nominatim for general places
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=10&addressdetails=1&extratags=1`)
            .then(res => res.json())
            .then(data => {
                // Filter Nominatim results to only show those within the 500m radius
                const filteredNominatim = data.filter(result => {
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    const latlng = L.latLng(lat, lng);
                    const distance = map.distance(latlng, cvsuLatLngObj);
                    return distance <= RADIUS;
                }).map(result => ({
                    ...result,
                    isEstablishment: false
                }));

                // Combine both results (establishments first)
                allResults = [...allResults, ...filteredNominatim];
                displaySearchResults(allResults);
            })
            .catch(err => {
                console.error('Search error:', err);
                // Even if Nominatim fails, show establishment results if any
                if (allResults.length > 0) {
                    displaySearchResults(allResults);
                } else {
                    autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">Search failed. Please try again.</div>';
                }
            });
    }

    function displaySearchResults(results) {
        currentSelectedIndex = -1;
        if (results.length === 0) {
            autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No results found within 500m of CvSU</div>';
            return;
        }

        autocompleteDropdown.innerHTML = '';
        results.forEach((result) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';

            // Different display for establishments vs general places
            if (result.isEstablishment) {
                // For registered establishments
                const name = result.name;
                const address = result.address || 'Registered Establishment';

                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="
                            width: 32px;
                            height: 32px;
                            background: linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%);
                            border-radius: 6px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        ">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div class="autocomplete-name">🏪 ${name}</div>
                            <div class="autocomplete-address">${address}</div>
                        </div>
                    </div>
                `;
            } else {
                // For general Nominatim results
                const name = result.display_name.split(',')[0];
                const address = result.display_name;

                item.innerHTML = `
                    <div class="autocomplete-name">${name}</div>
                    <div class="autocomplete-address">${address}</div>
                `;
            }

            item.addEventListener('click', () => selectSearchResult(result, result.name || result.display_name.split(',')[0]));
            autocompleteDropdown.appendChild(item);
        });
    }

    function selectSearchResult(result, name) {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const latlng = L.latLng(lat, lng);
        const distance = map.distance(latlng, cvsuLatLngObj);

        if (distance <= RADIUS) {
            placeMarker(latlng);
            map.setView(latlng, 18);
            searchInput.value = name;
            showLocationStatus('Location selected!', 'success');
        } else {
            showLocationStatus('This location is outside the 500m radius', 'error');
            msg.textContent = '❌ Please select a location within the circle (within 500m).';
            msg.className = 'map-validation-message invalid';
        }
        autocompleteDropdown.classList.remove('show');
    }

    focusCvsuBtn.addEventListener('click', () => {
        map.setView(cvsuLatLngObj, 16);
        focusCvsuBtn.disabled = true;
        setTimeout(() => { focusCvsuBtn.disabled = false; }, 500);
    });

    useCurrentLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showLocationStatus('❌ Geolocation not supported by your browser', 'error');
            return;
        }

        // Disable button and show immediate feedback
        useCurrentLocationBtn.disabled = true;
        useCurrentLocationBtn.style.opacity = '0.6';
        showLocationStatus('🔍 Locating you...', 'loading');

        // Optimized options for fastest response
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 8000,           // 8 seconds timeout
            maximumAge: 0            // Always get fresh position
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                const userLatLng = L.latLng(lat, lng);
                const distance = map.distance(userLatLng, cvsuLatLngObj);

                console.log(`📍 GPS Lock: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}, Accuracy ±${accuracy.toFixed(0)}m`);

                if (distance <= RADIUS) {
                    placeMarker(userLatLng);
                    map.setView(userLatLng, 18, { animate: true, duration: 0.5 });

                    // Show success with accuracy info
                    const accuracyText = accuracy < 20 ? '🎯 Very accurate' : accuracy < 50 ? '✅ Good' : '📍 Located';
                    showLocationStatus(`${accuracyText} (±${Math.round(accuracy)}m)`, 'success');

                    // Auto-hide success message after 3 seconds
                    setTimeout(() => {
                        const statusEl = document.getElementById('location-status');
                        if (statusEl) statusEl.style.display = 'none';
                    }, 3000);
                } else {
                    const distanceKm = (distance / 1000).toFixed(2);
                    showLocationStatus(`❌ You're ${distanceKm}km away (limit: 500m)`, 'error');
                    msg.textContent = `❌ Your location is ${Math.round(distance)}m from CvSU. Please select within 500m.`;
                    msg.className = 'map-validation-message invalid';
                }

                useCurrentLocationBtn.disabled = false;
                useCurrentLocationBtn.style.opacity = '1';
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMsg = '❌ Unable to get location';

                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = '❌ Location access denied. Please enable location permissions.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = '❌ Location unavailable. Make sure GPS is enabled.';
                        break;
                    case error.TIMEOUT:
                        errorMsg = '⏱️ Location timeout. Please try again.';
                        break;
                    default:
                        errorMsg = `❌ Error: ${error.message}`;
                }

                showLocationStatus(errorMsg, 'error');
                useCurrentLocationBtn.disabled = false;
                useCurrentLocationBtn.style.opacity = '1';
            },
            geoOptions
        );
    });

    removePinBtn.addEventListener('click', () => {
        if (!removePinBtn.classList.contains('active')) return;

        if (window.userMarker) {
            map.removeLayer(window.userMarker);
            window.userMarker = null;
            sessionStorage.removeItem('latitude');
            sessionStorage.removeItem('longitude');
            updateRemovePinButton(false);

            const locationInfo = document.getElementById('location-info');
            if (locationInfo) locationInfo.classList.remove('show');

            msg.textContent = 'Please pin a location on the map.';
            msg.className = 'map-validation-message';
            nextBtn.disabled = true;
            searchInput.value = '';
            clearSearchBtn.classList.remove('show');
            showLocationStatus('Pin removed', 'success');
            setTimeout(() => hideLocationStatus(), 2000);
        }
    });

    function placeMarker(latlng) {
        if (window.userMarker) {
            window.userMarker.setLatLng(latlng);
        } else {
            window.userMarker = L.marker(latlng, {
                draggable: true,
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);

            window.userMarker.on('dragend', (evt) => {
                const pos = evt.target.getLatLng();
                const distance = map.distance(pos, cvsuLatLngObj);
                if (distance <= RADIUS) {
                    validatePosition(pos);
                } else {
                    msg.textContent = '❌ Pin must be within the circle (within 500m).';
                    msg.className = 'map-validation-message invalid';
                    nextBtn.disabled = true;
                    updateRemovePinButton(false);
                }
            });
        }
        validatePosition(latlng);
    }

    function showLocationStatus(message, type) {
        locationStatus.className = `location-status ${type}`;
        locationStatus.style.display = 'block';

        if (type === 'loading') {
            locationStatus.innerHTML = `<span class="spinner"></span>${message}`;
        } else {
            locationStatus.textContent = message;
        }
    }

    function hideLocationStatus() {
        setTimeout(() => { locationStatus.style.display = 'none'; }, 3000);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            autocompleteDropdown.classList.remove('show');
        }
    });

    // Display establishment count
    const estCountElement = document.getElementById('est-count-number');
    if (estCountElement && typeof REGISTERED_ESTABLISHMENTS !== 'undefined') {
        const count = REGISTERED_ESTABLISHMENTS.length;
        estCountElement.textContent = `📍 ${count} establishment${count !== 1 ? 's' : ''} currently registered near CvSU`;
        estCountElement.style.color = count > 0 ? '#4CAF50' : '#999';
    }
}

/* ============================================================
   STEP 2 – ESTABLISHMENT DETAILS
   ============================================================ */
/* ============================================================
   STEP 2 – ESTABLISHMENT DETAILS (COMPLETE WITH MULTIPLE SELECTION)
   ✅ Categories: Multiple checkboxes + "Other" with text input
   ✅ Amenities: Multiple checkboxes + "Other" with text input
   ============================================================ */
function initStep2() {
    // Check if Step 1 was completed
    if (!sessionStorage.getItem('latitude')) {
        console.warn('⚠️ Please complete Step 1 first. Redirecting...');
        window.location.href = '/owner/register/location/';
        return;
    }

    const form = document.getElementById('details-form');
    const nextBtn = document.getElementById('next-step-btn');
    const backBtn = document.getElementById('back-step-btn');
    const addressInput = document.getElementById('address');

    // Get location from Step 1
    const lat = sessionStorage.getItem('latitude');
    const lng = sessionStorage.getItem('longitude');

    // ============================================================
    // WEEKLY SCHEDULE HELPERS
    // ============================================================

    /** Returns array of 7 schedule objects from the current UI state */
    function getWeeklySchedule() {
        const rows = document.querySelectorAll('.schedule-row[data-day]');
        const schedule = [];
        rows.forEach(function (row) {
            const day    = parseInt(row.dataset.day, 10);
            const cb     = row.querySelector('.day-open-cb');
            const openT  = row.querySelector('.day-open-t');
            const closeT = row.querySelector('.day-close-t');
            schedule.push({
                day:       day,
                is_closed: cb ? !cb.checked : true,
                opening:   openT  ? openT.value  : '',
                closing:   closeT ? closeT.value : ''
            });
        });
        return schedule;
    }

    /** Restores schedule UI from a saved array */
    function restoreWeeklySchedule(hours) {
        if (!Array.isArray(hours)) return;
        hours.forEach(function (entry) {
            const row    = document.querySelector(`.schedule-row[data-day="${entry.day}"]`);
            if (!row) return;
            const cb       = row.querySelector('.day-open-cb');
            const openT    = row.querySelector('.day-open-t');
            const closeT   = row.querySelector('.day-close-t');
            const label    = row.querySelector('.sd-label');
            const timesDiv = row.querySelector('.sd-times');
            const isOpen   = !entry.is_closed;

            if (cb) cb.checked = isOpen;
            if (openT  && entry.opening) openT.value  = entry.opening;
            if (closeT && entry.closing) closeT.value = entry.closing;
            if (label)    label.textContent = isOpen ? 'Open' : 'Closed';
            if (timesDiv) {
                timesDiv.classList.toggle('sd-times-closed', !isOpen);
                row.querySelectorAll('input[type="time"]').forEach(function (inp) {
                    inp.disabled = !isOpen;
                });
            }
            row.classList.toggle('row-closed', !isOpen);
        });
    }

    /** Wire up toggle switches and time input changes on schedule rows */
    function initScheduleUI() {
        document.querySelectorAll('.day-open-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
                const day      = this.dataset.day;
                const row      = document.querySelector(`.schedule-row[data-day="${day}"]`);
                const label    = row ? row.querySelector('.sd-label')    : null;
                const timesDiv = row ? row.querySelector('.sd-times')    : null;
                const isOpen   = this.checked;

                if (label)    label.textContent = isOpen ? 'Open' : 'Closed';
                if (timesDiv) {
                    timesDiv.classList.toggle('sd-times-closed', !isOpen);
                    row.querySelectorAll('input[type="time"]').forEach(function (inp) {
                        inp.disabled = !isOpen;
                    });
                }
                if (row) row.classList.toggle('row-closed', !isOpen);

                saveDraft();
                validateForm();
            });
        });

        document.querySelectorAll('.day-open-t, .day-close-t').forEach(function (inp) {
            inp.addEventListener('change', function () {
                saveDraft();
                validateForm();
            });
        });
    }

    // ============================================================
    // SAVE STEP 2 DRAFT — real-time save to sessionStorage
    // ============================================================
    function saveDraft() {
        const selectedCategories = Array.from(form.querySelectorAll('input[name="categories"]:checked'))
            .map(el => el.value);
        const selectedAmenities = Array.from(form.querySelectorAll('input[name="amenities"]:checked'))
            .map(el => el.value);
        const selectedPayments = Array.from(form.querySelectorAll('input[name="payment_methods"]:checked'))
            .map(el => el.value);

        const draft = {
            name: form.querySelector('#name').value,
            weekly_hours: getWeeklySchedule(),
            categories: selectedCategories,
            amenities: selectedAmenities,
            paymentMethods: selectedPayments,
            other_category_text: document.getElementById('other_category_text')?.value || '',
            other_amenity_text: document.getElementById('other_amenity_text')?.value || '',
        };
        sessionStorage.setItem('step2Draft', JSON.stringify(draft));
        if (typeof window.saveContactLinksDraft === 'function') window.saveContactLinksDraft();
    }

    // ============================================================
    // RESTORE STEP 2 DRAFT — called on page load
    // ============================================================
    function restoreDraft() {
        const saved = sessionStorage.getItem('step2Draft');
        if (!saved) return;
        const draft = JSON.parse(saved);

        // Text fields
        if (draft.name) form.querySelector('#name').value = draft.name;
        if (draft.weekly_hours) restoreWeeklySchedule(draft.weekly_hours);

        // Categories checkboxes
        if (draft.categories) {
            draft.categories.forEach(val => {
                const cb = form.querySelector(`input[name="categories"][value="${val}"]`);
                if (cb) cb.checked = true;
            });
        }

        // "Other" category text
        const categoryOtherCb = document.getElementById('category_other');
        if (categoryOtherCb && categoryOtherCb.checked) {
            const otherContainer = document.getElementById('other-category-container');
            const otherInput = document.getElementById('other_category_text');
            if (otherContainer) otherContainer.classList.add('show');
            if (otherInput && draft.other_category_text) otherInput.value = draft.other_category_text;
        }

        // Amenities checkboxes
        if (draft.amenities) {
            draft.amenities.forEach(val => {
                const cb = form.querySelector(`input[name="amenities"][value="${val}"]`);
                if (cb) cb.checked = true;
            });
        }

        // "Other" amenity text
        const amenityOtherCb = document.getElementById('amenity_other');
        if (amenityOtherCb && amenityOtherCb.checked) {
            const otherContainer = document.getElementById('other-amenity-container');
            const otherInput = document.getElementById('other_amenity_text');
            if (otherContainer) otherContainer.classList.add('show');
            if (otherInput && draft.other_amenity_text) otherInput.value = draft.other_amenity_text;
        }

        // Payment methods checkboxes
        if (draft.paymentMethods) {
            draft.paymentMethods.forEach(val => {
                const cb = form.querySelector(`input[name="payment_methods"][value="${val}"]`);
                if (cb) cb.checked = true;
            });
        }
    }

    // Fetch and auto-fill address from coordinates
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                addressInput.value = data.display_name;
            }
            validateForm();
        })
        .catch(err => {
            console.error('❌ Error fetching address:', err);
            addressInput.value = 'Could not fetch address. Please check connection.';
            validateForm();
        });

    // ============================================================
    // CHECKBOX VISUAL FEEDBACK AND INTERACTION
    // ============================================================
    const checkboxItems = document.querySelectorAll('[data-checkbox-item]');

    checkboxItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');

        item.addEventListener('click', function(e) {
            if (e.target !== checkbox && e.target.tagName !== 'LABEL') {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        checkbox.addEventListener('change', function() {
            if (this.checked) {
                item.classList.add('checked');
            } else {
                item.classList.remove('checked');
            }
            validateForm();
        });
    });

    // ============================================================
    // "OTHER" CATEGORY HANDLING + REALTIME INDICATOR
    // ============================================================
    const categoryOtherCheckbox = document.getElementById('category_other');
    const otherCategoryContainer = document.getElementById('other-category-container');
    const otherCategoryInput = document.getElementById('other_category_text');
    const categoryHint = document.getElementById('category-hint');

    function getExistingCategoryNames() {
        return Array.from(document.querySelectorAll('#category-group input[name="categories"]'))
            .filter(cb => cb.value !== 'other')
            .map(cb => {
                const label = document.querySelector(`label[for="${cb.id}"]`);
                return label ? label.textContent.trim() : '';
            })
            .filter(Boolean);
    }

    // ============================================================
    // WORD VALIDATOR — TIGHTENED GIBBERISH/MASH DETECTION
    // ============================================================
    function isValidWordInput(val) {
        if (!val || !val.trim()) return false;
        // Letters/spaces/hyphens/apostrophes only, no digits
        if (!/^[a-zA-Z\u00C0-\u017E\s\-']+$/.test(val)) return false;

        const spaceWords = val.trim().split(/\s+/).filter(Boolean);
        const VOWELS = /[aeiouAEIOUyY\u00C0-\u00FF]/g;
        // 3+ consecutive consonants
        const SHORT_CONS = /[^aeiouAEIOUyY\u00C0-\u00FF']{3,}/;
        // 4+ consecutive consonants
        const LONG_CONS  = /[^aeiouAEIOUyY\u00C0-\u00FF']{4,}/;
        // 'q' must always be followed by 'u'
        const BAD_Q = /q(?!u)/i;
        // Keyboard smashes/random gibberish sequences detection
        const MASHES = /(qwerty|qwert|wert|erty|rtyu|tyui|yuio|uiop|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm|tywer|ywerh|werhs|ywerhs)/i;
        // NEW: Detect repeating patterns like "weyweywey" or "yutyutyut" (2+ chars repeated 2+ extra times)
        const REPEATING_PATTERNS = /(.{2,})\1{2,}/i;
        // NEW: Detect 3 identical characters in a row like "aaa" or "fff"
        const REPEATING_CHARS = /(.)\1{2,}/i;

        return spaceWords.every(function(spaceWord) {
            const parts = spaceWord.split('-').filter(Boolean);
            const isCompound = parts.length > 1;
            // Hyphenated parts (e.g. "Pet" in Pet-Friendly) allowed at 3 chars
            const minLen = isCompound ? 3 : 4;

            return parts.every(function(word) {
                if (word.length < minLen) return false;
                if (word.length > 20) return false; // MAX LENGTH constraint per word

                if (!/[aeiouAEIOUyY\u00C0-\u00FF]/.test(word)) return false;
                if (BAD_Q.test(word)) return false;
                if (MASHES.test(word)) return false; // Blocks 'tywerhs' and similar
                if (REPEATING_PATTERNS.test(word)) return false; // Blocks 'weyweywey'
                if (REPEATING_CHARS.test(word)) return false; // Blocks 'aaa'

                if (word.length <= 5) {
                    if (SHORT_CONS.test(word)) return false;
                } else {
                    const vowelCount = (word.match(VOWELS) || []).length;
                    // Tightened vowel ratio: English/Tagalog words usually have > 25% vowels.
                    if (vowelCount / word.length <= 0.25) return false;
                    if (LONG_CONS.test(word)) return false;
                    // Block ending with 3 consonants unless standard ending
                    if (/[^aeiouAEIOUyY\u00C0-\u00FF']{3,}$/.test(word) && !/(ght|tch|rth|mph|nch|lds|rts|sts|sts)$/i.test(word)) return false;
                }
                return true;
            });
        });
    }

    function updateCategoryHint() {
        if (!categoryHint) return;
        const val = (otherCategoryInput.value || '').trim();
        const existingNames = getExistingCategoryNames();

        if (!val) {
            categoryHint.className = 'other-realtime-hint';
            categoryHint.innerHTML = '';
            otherCategoryInput.classList.remove('input-invalid', 'input-valid');
            return;
        }

        // Validate word
        if (!isValidWordInput(val)) {
            otherCategoryInput.classList.add('input-invalid');
            otherCategoryInput.classList.remove('input-valid');
            categoryHint.className = 'other-realtime-hint show';
            categoryHint.innerHTML = `<div class="hint-duplicate">⚠️ Please enter a <strong>full and real word</strong> (e.g. "Vegan Restaurant", "Carinderia"). Incomplete words, numbers, or random characters are not allowed. Minimum of 4 letters per word.</div>`;
            return;
        }

        const valLower = val.toLowerCase();
        const matchedNames = existingNames.filter(name =>
            name.toLowerCase() === valLower ||
            name.toLowerCase().includes(valLower) ||
            valLower.includes(name.toLowerCase())
        );

        if (matchedNames.length > 0) {
            otherCategoryInput.classList.add('input-invalid');
            otherCategoryInput.classList.remove('input-valid');
            const tagsHtml = existingNames.map(name => {
                const isMatch = name.toLowerCase() === valLower ||
                    name.toLowerCase().includes(valLower) ||
                    valLower.includes(name.toLowerCase());
                return `<span class="hint-tag${isMatch ? ' matched' : ''}">${name}</span>`;
            }).join('');
            categoryHint.className = 'other-realtime-hint show';
            categoryHint.innerHTML = `
                <div class="hint-duplicate">
                    <span>⚠️ <strong>"${val}"</strong> is similar to an existing category. Please choose from the list or type a different name.</span>
                </div>
                <div class="hint-existing-list">${tagsHtml}</div>`;
        } else {
            otherCategoryInput.classList.remove('input-invalid');
            otherCategoryInput.classList.add('input-valid');
            categoryHint.className = 'other-realtime-hint show';
            categoryHint.innerHTML = `<div class="hint-valid">✅ <strong>"${val}"</strong> — valid new category!</div>`;
        }
    }

    if (categoryOtherCheckbox) {
        categoryOtherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                otherCategoryContainer.classList.add('show');
                otherCategoryInput.required = true;
                otherCategoryInput.focus();
            } else {
                otherCategoryContainer.classList.remove('show');
                otherCategoryInput.required = false;
                otherCategoryInput.value = '';
                otherCategoryInput.classList.remove('input-invalid', 'input-valid');
                if (categoryHint) { categoryHint.className = 'other-realtime-hint'; categoryHint.innerHTML = ''; }
            }
            validateForm();
        });

        otherCategoryInput.addEventListener('input', () => {
            updateCategoryHint();
            validateForm();
        });
    }

    // ============================================================
    // "OTHER" AMENITY HANDLING + REALTIME INDICATOR
    // ============================================================
    const amenityOtherCheckbox = document.getElementById('amenity_other');
    const otherAmenityContainer = document.getElementById('other-amenity-container');
    const otherAmenityInput = document.getElementById('other_amenity_text');
    const amenityHint = document.getElementById('amenity-hint');

    function getExistingAmenityNames() {
        return Array.from(document.querySelectorAll('#amenities-group input[name="amenities"]'))
            .filter(cb => cb.value !== 'other')
            .map(cb => {
                const label = document.querySelector(`label[for="${cb.id}"]`);
                return label ? label.textContent.trim() : '';
            })
            .filter(Boolean);
    }

    function updateAmenityHint() {
        if (!amenityHint) return;
        const val = (otherAmenityInput.value || '').trim();
        const existingNames = getExistingAmenityNames();

        if (!val) {
            amenityHint.className = 'other-realtime-hint';
            amenityHint.innerHTML = '';
            otherAmenityInput.classList.remove('input-invalid', 'input-valid');
            return;
        }

        // Validate word
        if (!isValidWordInput(val)) {
            otherAmenityInput.classList.add('input-invalid');
            otherAmenityInput.classList.remove('input-valid');
            amenityHint.className = 'other-realtime-hint show';
            amenityHint.innerHTML = `<div class="hint-duplicate">⚠️ Please enter a <strong>full and real word</strong> (e.g. "Live Music", "Rooftop Seating"). Incomplete words, numbers, or random characters are not allowed. Minimum of 4 letters per word.</div>`;
            return;
        }

        const valLower = val.toLowerCase();
        const matchedNames = existingNames.filter(name =>
            name.toLowerCase() === valLower ||
            name.toLowerCase().includes(valLower) ||
            valLower.includes(name.toLowerCase())
        );

        if (matchedNames.length > 0) {
            otherAmenityInput.classList.add('input-invalid');
            otherAmenityInput.classList.remove('input-valid');
            const tagsHtml = existingNames.map(name => {
                const isMatch = name.toLowerCase() === valLower ||
                    name.toLowerCase().includes(valLower) ||
                    valLower.includes(name.toLowerCase());
                return `<span class="hint-tag${isMatch ? ' matched' : ''}">${name}</span>`;
            }).join('');
            amenityHint.className = 'other-realtime-hint show';
            amenityHint.innerHTML = `
                <div class="hint-duplicate">
                    <span>⚠️ <strong>"${val}"</strong> is similar to an existing amenity. Please choose from the list or type a different name.</span>
                </div>
                <div class="hint-existing-list">${tagsHtml}</div>`;
        } else {
            otherAmenityInput.classList.remove('input-invalid');
            otherAmenityInput.classList.add('input-valid');
            amenityHint.className = 'other-realtime-hint show';
            amenityHint.innerHTML = `<div class="hint-valid">✅ <strong>"${val}"</strong> — valid new amenity!</div>`;
        }
    }

    if (amenityOtherCheckbox) {
        amenityOtherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                otherAmenityContainer.classList.add('show');
                otherAmenityInput.required = true;
                otherAmenityInput.focus();
            } else {
                otherAmenityContainer.classList.remove('show');
                otherAmenityInput.required = false;
                otherAmenityInput.value = '';
                otherAmenityInput.classList.remove('input-invalid', 'input-valid');
                if (amenityHint) { amenityHint.className = 'other-realtime-hint'; amenityHint.innerHTML = ''; }
            }
            validateForm();
        });

        otherAmenityInput.addEventListener('input', () => {
            updateAmenityHint();
            validateForm();
        });
    }

    // ============================================================
    // FORM VALIDATION
    // ============================================================
    function validateForm() {
        let isValid = true;

        // 1. Validate regular required fields (name, address — not schedule time inputs)
        const requiredInputs = form.querySelectorAll('input[required]:not([type="checkbox"])');
        requiredInputs.forEach(input => {
            if (!input.value || !input.value.trim()) {
                isValid = false;
            }
        });

        // 1b. Validate weekly schedule — at least one day must be open with valid hours
        const scheduleError = document.getElementById('schedule-error');
        const schedule = getWeeklySchedule();
        const hasValidDay = schedule.some(function (entry) {
            return !entry.is_closed && entry.opening && entry.closing;
        });
        if (!hasValidDay) {
            if (scheduleError) scheduleError.style.display = 'block';
            isValid = false;
        } else {
            if (scheduleError) scheduleError.style.display = 'none';
        }

        // 2. Validate Categories
        const categoryCheckboxes = form.querySelectorAll('input[name="categories"]:checked');
        const categoryError = document.getElementById('category-error');

        if (categoryCheckboxes.length === 0) {
            categoryError.classList.add('show');
            isValid = false;
        } else {
            categoryError.classList.remove('show');
        }

        // 3. If "Other" category is checked, validate the text input AND check for duplicates
        if (categoryOtherCheckbox && categoryOtherCheckbox.checked) {
            const catVal = (otherCategoryInput.value || '').trim();
            if (!catVal) {
                isValid = false;
            } else if (!isValidWordInput(catVal)) {
                isValid = false;
            } else {
                const catNames = typeof getExistingCategoryNames === 'function' ? getExistingCategoryNames() : [];
                const catLower = catVal.toLowerCase();
                const isDuplicate = catNames.some(name =>
                    name.toLowerCase() === catLower ||
                    name.toLowerCase().includes(catLower) ||
                    catLower.includes(name.toLowerCase())
                );
                if (isDuplicate) isValid = false;
            }
        }

        // 4. Validate Payment Methods
        const paymentCheckboxes = form.querySelectorAll('input[name="payment_methods"]:checked');
        const paymentError = document.getElementById('payment-error');

        if (paymentCheckboxes.length === 0) {
            paymentError.classList.add('show');
            isValid = false;
        } else {
            paymentError.classList.remove('show');
        }

        // 5. Validate Amenities
        const amenityCheckboxes = form.querySelectorAll('input[name="amenities"]:checked');
        const amenitiesError = document.getElementById('amenities-error');

        if (amenityCheckboxes.length === 0) {
            amenitiesError.classList.add('show');
            isValid = false;
        } else {
            amenitiesError.classList.remove('show');
        }

        // 6. If "Other" amenity is checked, validate the text input AND check for duplicates
        if (amenityOtherCheckbox && amenityOtherCheckbox.checked) {
            const amenVal = (otherAmenityInput.value || '').trim();
            if (!amenVal) {
                isValid = false;
            } else if (!isValidWordInput(amenVal)) {
                isValid = false;
            } else {
                const amenNames = typeof getExistingAmenityNames === 'function' ? getExistingAmenityNames() : [];
                const amenLower = amenVal.toLowerCase();
                const isDuplicate = amenNames.some(name =>
                    name.toLowerCase() === amenLower ||
                    name.toLowerCase().includes(amenLower) ||
                    amenLower.includes(name.toLowerCase())
                );
                if (isDuplicate) isValid = false;
            }
        }

        nextBtn.disabled = !isValid;
        return isValid;
    }

    form.addEventListener('input', validateForm);
    form.addEventListener('change', validateForm);
    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);

    initScheduleUI();
    restoreDraft();
    validateForm();

    backBtn.addEventListener('click', () => {
        window.location.href = '/owner/register/location/';
    });

    nextBtn.addEventListener('click', () => {
        if (!validateForm()) {
            alert('⚠️ Please fill in all required fields properly.');
            return;
        }

        const selectedCategories = Array.from(form.querySelectorAll('input[name="categories"]:checked'))
            .map(el => el.value)
            .filter(val => val !== 'other');

        const otherCategory = categoryOtherCheckbox && categoryOtherCheckbox.checked
            ? otherCategoryInput.value.trim()
            : null;

        const selectedAmenities = Array.from(form.querySelectorAll('input[name="amenities"]:checked'))
            .map(el => el.value)
            .filter(val => val !== 'other');

        const otherAmenity = amenityOtherCheckbox && amenityOtherCheckbox.checked
            ? otherAmenityInput.value.trim()
            : null;

        const paymentMethods = Array.from(form.querySelectorAll('input[name="payment_methods"]:checked'))
            .map(el => el.value);

        const details = {
            name: form.querySelector('#name').value.trim(),
            address: form.querySelector('#address').value.trim(),
            weekly_hours: getWeeklySchedule(),
            categories: selectedCategories,
            other_category: otherCategory,
            paymentMethods: paymentMethods,
            amenities: selectedAmenities,
            other_amenity: otherAmenity,
            contact_links: (typeof window.getContactLinks === 'function') ? window.getContactLinks() : [],
        };

        const fileInput = document.getElementById('establishment_image');

        if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => {
                sessionStorage.setItem('establishment_image_data', e.target.result);
                sessionStorage.setItem('establishmentDetails', JSON.stringify(details));
                window.location.href = '/owner/register/credentials/';
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            alert('⚠️ Please upload your establishment image.');
        }
    });
}

/* ============================================================
   STEP 3 – ACCOUNT CREDENTIALS + OTP
   ============================================================ */
function initStep3() {
    if (!sessionStorage.getItem('establishmentDetails')) {
        console.warn('Please complete Step 2 first. Redirecting...');
        window.location.href = '/owner/register/details/';
        return;
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const retypeInput = document.getElementById('retype-password');
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const backBtn = document.getElementById('back-step-btn');
    const otpModal = document.getElementById('otpModal');
    const otpForm = document.getElementById('otpForm');
    const otpError = document.getElementById('otpError');
    const loading = document.getElementById('loadingSpinner');
    const successModal = document.getElementById('successModal');
    const otpEmailDisplay = document.getElementById('otp-email-display');
    const otpTimer = document.getElementById('otp-timer');
    const otpTimerLabel = document.getElementById('otp-timer-label');
    const otpTimerContainer = document.getElementById('otp-timer-container');
    const resendOtpBtn = document.getElementById('resend-otp-btn');
    const resendCountdown = document.getElementById('resend-countdown');

    let otpExpiryTime = null;
    let timerInterval = null;
    let resendCooldownTime = null;
    let resendInterval = null;

    function validateInputs() {
        const emailVal = emailInput.value.trim();
        const emailErrEl = document.getElementById('email-error-msg');
        const passErrEl = document.getElementById('password-error-msg');
        const retypeErrEl = document.getElementById('retype-error-msg');

        emailInput.style.borderColor = '';

        let emailError = '';
        if (emailVal === '') {
            emailError = '';
        } else if (!emailVal.includes('@')) {
            emailError = '❌ Missing "@" symbol (e.g. juan@gmail.com)';
        } else if (emailVal.endsWith('@')) {
            emailError = '❌ Please enter a domain after "@" (e.g. @gmail.com)';
        } else if (!emailInput.validity.valid) {
            emailError = '❌ Invalid email format (e.g. juan@gmail.com)';
        }
        if (emailErrEl) emailErrEl.textContent = emailError;

        let passwordError = '';
        if (passwordInput.value.length > 0 && passwordInput.value.length < 8) {
            passwordError = '❌ Password must be at least 8 characters';
        }
        if (passErrEl) passErrEl.textContent = passwordError;

        let retypeError = '';
        if (retypeInput.value.length > 0 && passwordInput.value !== retypeInput.value) {
            retypeError = '❌ Passwords do not match';
        }
        if (retypeErrEl) retypeErrEl.textContent = retypeError;

        const ok = passwordInput.value.length >= 8 &&
                   passwordInput.value === retypeInput.value &&
                   emailInput.validity.valid;
        sendOtpBtn.disabled = !ok;
    }

    [emailInput, passwordInput, retypeInput].forEach(el => el.addEventListener('input', validateInputs));
    backBtn.addEventListener('click', () => window.location.href = '/owner/register/details/');

    function startOtpTimer() {
        if (timerInterval) clearInterval(timerInterval);
        otpExpiryTime = Date.now() + (10 * 60 * 1000);

        timerInterval = setInterval(() => {
            const remaining = otpExpiryTime - Date.now();

            if (remaining <= 0) {
                clearInterval(timerInterval);
                otpTimer.textContent = '0:00';
                otpTimer.style.color = '#dc2626';
                otpTimerLabel.textContent = 'OTP expired!';
                otpTimerContainer.style.background = '';
                otpError.textContent = 'OTP has expired. Please request a new one.';
                document.getElementById('verify-otp-btn').disabled = true;
                resendOtpBtn.disabled = false;
                resendOtpBtn.style.color = '#e53935';
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            otpTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (remaining < 120000) {
                otpTimer.style.color = '#f59e0b';
            }
        }, 1000);
    }

    function startResendCooldown() {
        resendOtpBtn.disabled = true;
        resendCooldownTime = Date.now() + (30 * 1000);

        if (resendInterval) clearInterval(resendInterval);

        resendInterval = setInterval(() => {
            const remaining = resendCooldownTime - Date.now();

            if (remaining <= 0) {
                clearInterval(resendInterval);
                resendOtpBtn.disabled = false;
                resendCountdown.textContent = '';
                return;
            }

            const seconds = Math.ceil(remaining / 1000);
            resendCountdown.textContent = `(${seconds}s)`;
        }, 100);
    }

    function sendOTP() {
        const email = emailInput.value;
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';

        const csrftoken = getCookie('csrftoken');

        fetch('/api/send-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                otpEmailDisplay.textContent = email;
                otpModal.style.display = 'flex';
                startOtpTimer();
                startResendCooldown();

                document.getElementById('otp-input').value = '';
                otpError.textContent = '';
                document.getElementById('verify-otp-btn').disabled = false;

                otpTimer.style.color = '#dc2626';
                otpTimerLabel.textContent = 'OTP expires in:';
                otpTimerContainer.style.background = '#f0f9ff';
            } else {
                const emailErrEl = document.getElementById('email-error-msg');
                const errorMsg = data.error || 'Failed to send OTP. Please try again.';
                if (emailErrEl) {
                    emailErrEl.textContent = '❌ ' + errorMsg;
                    emailInput.style.borderColor = '#e53935';
                    emailInput.focus();
                } else {
                    alert(errorMsg);
                }
            }
        })
        .catch((err) => {
            alert('Network error. Please check your connection.');
        })
        .finally(() => {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP to register establishment';
        });
    }

    sendOtpBtn.addEventListener('click', sendOTP);

    resendOtpBtn.addEventListener('click', () => {
        resendOtpBtn.disabled = true;
        resendOtpBtn.textContent = 'Sending...';

        const email = emailInput.value;
        const csrftoken = getCookie('csrftoken');

        fetch('/api/send-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                otpError.textContent = '';
                otpError.style.color = '#16a34a';
                otpError.textContent = '✓ New OTP sent successfully!';
                setTimeout(() => {
                    otpError.textContent = '';
                    otpError.style.color = 'red';
                }, 3000);

                startOtpTimer();
                startResendCooldown();
                document.getElementById('verify-otp-btn').disabled = false;

                otpTimer.style.color = '#dc2626';
                otpTimerLabel.textContent = 'OTP expires in:';
                otpTimerContainer.style.background = '#f0f9ff';
            } else {
                otpError.textContent = data.error || 'Failed to resend OTP';
            }
        })
        .catch((err) => {
            otpError.textContent = 'Network error. Please try again.';
        })
        .finally(() => {
            resendOtpBtn.disabled = false;
            resendOtpBtn.textContent = 'Resend OTP';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === successModal) successModal.style.display = 'none';
    });

    const closeOtpBtn = document.getElementById('close-otp-modal-btn');
    if (closeOtpBtn) {
        closeOtpBtn.addEventListener('click', () => {
            if (timerInterval) clearInterval(timerInterval);
            if (resendInterval) clearInterval(resendInterval);

            otpModal.style.display = 'none';
            document.getElementById('otp-input').value = '';
            otpError.textContent = '';
            otpTimer.textContent = '10:00';
            otpTimer.style.color = '#e53935';
            otpTimerLabel.textContent = 'Expires in';
            document.getElementById('verify-otp-btn').disabled = false;
            resendOtpBtn.disabled = true;
            resendCountdown.textContent = '';
        });
    }

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        otpError.textContent = '';
        loading.style.display = 'block';

        try {
            const otpCode = document.getElementById('otp-input').value.trim();
            const details = JSON.parse(sessionStorage.getItem('establishmentDetails'));
            const lat = sessionStorage.getItem('latitude');
            const lng = sessionStorage.getItem('longitude');
            const imgData = sessionStorage.getItem('establishment_image_data');

            const formData = new FormData();
            formData.append('otp', otpCode);
            formData.append('registrationData', JSON.stringify({
                ...details,
                latitude: lat,
                longitude: lng,
                email: emailInput.value,
                password: passwordInput.value,
                name: details.name
            }));

            if (imgData) {
                const blob = dataURLtoBlob(imgData);
                formData.append('cover_image', blob, 'establishment_image.jpg');
            }

            const csrftoken = getCookie('csrftoken');

            const res = await fetch('/api/verify-and-register/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrftoken
                }
            });

            const result = await res.json();

            if (!res.ok || !result.success) throw new Error(result.error || 'Registration failed.');

            if (timerInterval) clearInterval(timerInterval);
            if (resendInterval) clearInterval(resendInterval);

            sessionStorage.clear();
            otpModal.style.display = 'none';
            successModal.style.display = 'flex';
            setTimeout(() => window.location.href = result.redirect_url, 2000);
        } catch (err) {
            otpError.textContent = err.message;
        } finally {
            loading.style.display = 'none';
        }
    });
}

function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}