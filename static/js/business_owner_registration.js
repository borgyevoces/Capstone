/* ============================================================
   KABSU EATS – BUSINESS OWNER REGISTRATION (FULL 3-STEP FLOW)
   ✅ FIXED: OTP Modal now shows properly with CSRF token
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

    // Small subtle CvSU marker
    L.marker(cvsuLatLng, {
        icon: L.divIcon({
            className: 'cvsu-marker',
            html: `<div style="
                background: #1976D2;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        })
    }).addTo(map).bindPopup('<b>CvSU-Bacoor Campus</b>');

    // Subtle light boundary circle (very transparent)
    L.circle(cvsuLatLng, {
        color: '#2196F3',          // Blue border
        fillColor: '#E3F2FD',      // Very light blue fill
        fillOpacity: 0.15,         // Very transparent - establishments clearly visible
        weight: 2,                 // Thin border
        radius: RADIUS
    }).addTo(map);

    // Show existing registered establishments with circular PHOTO markers
    if (typeof EXISTING_ESTABLISHMENTS !== 'undefined' && EXISTING_ESTABLISHMENTS) {
        EXISTING_ESTABLISHMENTS.forEach(est => {
            if (est.latitude && est.longitude) {
                const isOpen = (est.status || '').toLowerCase() === 'open';
                const borderColor = isOpen ? '#10b981' : '#ef4444';

                let innerHtml;
                if (est.image_url) {
                    innerHtml = `<img src="${est.image_url}"
                        style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"
                        onerror="this.style.display='none';this.nextSibling.style.display='flex';">
                        <div style="display:none;width:100%;height:100%;border-radius:50%;
                            background:linear-gradient(135deg,#FF6B6B,#FF5252);color:#fff;
                            font-size:16px;font-weight:700;align-items:center;justify-content:center;">
                            ${est.name.charAt(0).toUpperCase()}
                        </div>`;
                } else {
                    innerHtml = `<div style="width:100%;height:100%;border-radius:50%;
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

                const marker = L.marker([est.latitude, est.longitude], { icon: estIcon }).addTo(map);

                const popupImg = est.image_url
                    ? `<div style="width:100%;height:80px;border-radius:6px;overflow:hidden;margin-bottom:8px;">
                         <img src="${est.image_url}" style="width:100%;height:100%;object-fit:cover;"
                              onerror="this.parentElement.style.display='none'">
                       </div>` : '';

                const statusBadge = `<span style="display:inline-block;padding:2px 8px;border-radius:20px;
                    font-size:10px;font-weight:700;
                    background:${isOpen ? '#dcfce7' : '#fee2e2'};
                    color:${isOpen ? '#166534' : '#991b1b'};">
                    ${isOpen ? '● Open' : '● Closed'}
                </span>`;

                marker.bindPopup(`
                    <div style="font-family:sans-serif;min-width:200px;max-width:230px;">
                        ${popupImg}
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;">
                            <strong style="color:#111827;font-size:13px;">${est.name}</strong>
                            ${statusBadge}
                        </div>
                        <div style="font-size:11px;color:#6b7280;">📍 ${est.address || 'Near CvSU-Bacoor'}</div>
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
        autocompleteDropdown.innerHTML = `<div class="autocomplete-loading"><span class="spinner"></span>Searching…</div>`;
        autocompleteDropdown.classList.add('show');

        // ── 1. Registered KabsuEats establishments (instant, client-side) ────
        let registeredMatches = [];
        if (typeof EXISTING_ESTABLISHMENTS !== 'undefined' && EXISTING_ESTABLISHMENTS) {
            const q = query.toLowerCase();
            registeredMatches = EXISTING_ESTABLISHMENTS
                .filter(est =>
                    (est.name && est.name.toLowerCase().includes(q)) ||
                    (est.address && est.address.toLowerCase().includes(q)) ||
                    (est.category__name && est.category__name.toLowerCase().includes(q))
                )
                .map(est => ({
                    _type: 'registered',
                    lat: est.latitude, lon: est.longitude,
                    name: est.name,
                    address: est.address || 'Near CvSU-Bacoor',
                    category: est.category__name || '',
                    status: est.status || '',
                    image_url: est.image_url || '',
                }));
        }

        // ── 2. Overpass API — searches actual OSM POI names (500m radius only) ──
        const overpassRadius = 600; // slightly wider than 500 so edge cases show
        const overpassUrl = `https://overpass-api.de/api/interpreter`;
        const q = query.toLowerCase().replace(/['"]/g, '');
        const overpassQuery = `[out:json][timeout:10];
(
  node["name"~"${q}",i](around:${overpassRadius},${cvsuLatLngObj.lat},${cvsuLatLngObj.lng});
  way["name"~"${q}",i](around:${overpassRadius},${cvsuLatLngObj.lat},${cvsuLatLngObj.lng});
);
out center 15;`;

        // ── 3. Nominatim — broader fallback, wider bbox ───────────────────────
        const delta = 0.05;
        const viewbox = `${cvsuLatLngObj.lng-delta},${cvsuLatLngObj.lat+delta},${cvsuLatLngObj.lng+delta},${cvsuLatLngObj.lat-delta}`;
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=0&limit=8&addressdetails=1&namedetails=1`;

        // Run Overpass + Nominatim in parallel
        Promise.allSettled([
            fetch(overpassUrl, {
                method: 'POST',
                body: overpassQuery,
                headers: { 'Content-Type': 'text/plain' }
            }).then(r => r.json()),
            fetch(nominatimUrl, { headers: { 'Accept-Language': 'en' } }).then(r => r.json())
        ]).then(([overpassRes, nominatimRes]) => {
            const placeResults = [];
            const seenNames = new Set();

            // Process Overpass results (most accurate — real OSM place names)
            if (overpassRes.status === 'fulfilled') {
                (overpassRes.value.elements || []).forEach(el => {
                    const lat = el.lat || el.center?.lat;
                    const lon = el.lon || el.center?.lon;
                    if (!lat || !lon) return;
                    const name = el.tags?.name || '';
                    if (!name) return;
                    const latlng = L.latLng(lat, lon);
                    const dist = Math.round(map.distance(latlng, cvsuLatLngObj));
                    if (dist > RADIUS) return; // STRICT: only inside 500m
                    if (seenNames.has(name.toLowerCase())) return;
                    seenNames.add(name.toLowerCase());
                    placeResults.push({
                        _type: 'place', lat, lon, name,
                        address: el.tags?.['addr:street'] || el.tags?.['addr:suburb'] || 'Near CvSU-Bacoor',
                        category: el.tags?.amenity || el.tags?.shop || el.tags?.leisure || el.tags?.tourism || '',
                        distance: dist, inside: true,
                        source: 'overpass'
                    });
                });
            }

            // Process Nominatim results (fallback, also filter to 500m)
            if (nominatimRes.status === 'fulfilled') {
                (nominatimRes.value || []).forEach(r => {
                    const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
                    const latlng = L.latLng(lat, lon);
                    const dist = Math.round(map.distance(latlng, cvsuLatLngObj));
                    if (dist > RADIUS) return; // STRICT: only inside 500m
                    const name = (r.namedetails?.name) || r.display_name.split(',')[0];
                    if (seenNames.has(name.toLowerCase())) return;
                    seenNames.add(name.toLowerCase());
                    const shortAddr = r.display_name.split(',').slice(1,3).join(',').trim();
                    placeResults.push({
                        _type: 'place', lat, lon, name,
                        address: shortAddr || r.display_name,
                        category: r.type || r.class || '',
                        distance: dist, inside: true,
                        source: 'nominatim'
                    });
                });
            }

            // Sort by distance
            placeResults.sort((a, b) => a.distance - b.distance);

            displaySearchResults([...registeredMatches, ...placeResults]);
        });
    }

    function displaySearchResults(results) {
        currentSelectedIndex = -1;
        if (results.length === 0) {
            autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No places found within 500m of CvSU.</div>';
            return;
        }

        autocompleteDropdown.innerHTML = '';
        let lastSection = null;

        function maybeAddHeader(label, color) {
            if (lastSection === label) return;
            lastSection = label;
            const hdr = document.createElement('div');
            hdr.style.cssText = `padding:6px 14px 4px;font-size:10px;font-weight:700;letter-spacing:0.8px;color:${color};text-transform:uppercase;background:#fafafa;border-bottom:1px solid #f0f0f0;`;
            hdr.textContent = label;
            autocompleteDropdown.appendChild(hdr);
        }

        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';

            if (result._type === 'registered') {
                maybeAddHeader('📋 Registered on KabsuEats', '#e53935');
                const isOpen = (result.status || '').toLowerCase() === 'open';
                const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isOpen?'#10b981':'#9ca3af'};margin-right:4px;"></span>`;
                let thumb;
                if (result.image_url) {
                    thumb = `<div style="width:42px;height:42px;border-radius:50%;overflow:hidden;border:2.5px solid ${isOpen?'#10b981':'#ef4444'};flex-shrink:0;">
                        <img src="${result.image_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.background='#FF6B6B';this.remove();">
                    </div>`;
                } else {
                    thumb = `<div style="width:42px;height:42px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#FF6B6B,#FF5252);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:17px;border:2.5px solid ${isOpen?'#10b981':'#ef4444'};">${result.name.charAt(0).toUpperCase()}</div>`;
                }
                item.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
                    ${thumb}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:13px;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${result.name}</div>
                        <div style="font-size:11px;color:#6b7280;margin-top:1px;">${dot}${isOpen?'Open':'Closed'}${result.category?' · '+result.category:''}</div>
                        <div style="font-size:11px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📍 ${result.address}</div>
                    </div>
                    <div style="font-size:10px;font-weight:700;color:#fff;background:#e53935;padding:2px 6px;border-radius:4px;flex-shrink:0;">KE</div>
                </div>`;

            } else {
                maybeAddHeader('📍 Places within 500m of CvSU', '#1976d2');
                const catIcons = {restaurant:'🍽️',cafe:'☕',fast_food:'🍟',bar:'🍺',convenience:'🏪',
                    shop:'🛍️',supermarket:'🛒',school:'🏫',church:'⛪',hospital:'🏥',bank:'🏦',
                    fuel:'⛽',pharmacy:'💊',park:'🌳',townhall:'🏛️',residential:'🏠',hotel:'🏨'};
                const icon = catIcons[result.category] || '📍';
                item.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:42px;height:42px;border-radius:50%;flex-shrink:0;background:#e3f2fd;display:flex;align-items:center;justify-content:center;font-size:21px;border:2px solid #90caf9;">${icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:13px;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${result.name}</div>
                        <div style="font-size:11px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${result.address}</div>
                    </div>
                    <div style="font-size:11px;font-weight:600;color:#10b981;flex-shrink:0;">${result.distance}m</div>
                </div>`;
            }

            item.addEventListener('click', () => {
                const latlng = L.latLng(result.lat, result.lon);
                placeMarker(latlng);
                map.flyTo(latlng, 18, { duration: 0.8 });
                searchInput.value = result.name;
                clearSearchBtn.classList.add('show');
                showLocationStatus('📍 Location selected!', 'success');
                autocompleteDropdown.classList.remove('show');
            });

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

        // Click anywhere on item to toggle checkbox
        item.addEventListener('click', function(e) {
            if (e.target !== checkbox && e.target.tagName !== 'LABEL') {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        // Visual feedback when checked
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
    // "OTHER" CATEGORY HANDLING
    // ============================================================
    const categoryOtherCheckbox = document.getElementById('category_other');
    const otherCategoryContainer = document.getElementById('other-category-container');
    const otherCategoryInput = document.getElementById('other_category_text');

    if (categoryOtherCheckbox) {
        categoryOtherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Show the text input field
                otherCategoryContainer.classList.add('show');
                otherCategoryInput.required = true;
                otherCategoryInput.focus();
            } else {
                // Hide the text input field
                otherCategoryContainer.classList.remove('show');
                otherCategoryInput.required = false;
                otherCategoryInput.value = '';
            }
            validateForm();
        });

        // Validate when typing in other category field
        otherCategoryInput.addEventListener('input', validateForm);
    }

    // ============================================================
    // "OTHER" AMENITY HANDLING
    // ============================================================
    const amenityOtherCheckbox = document.getElementById('amenity_other');
    const otherAmenityContainer = document.getElementById('other-amenity-container');
    const otherAmenityInput = document.getElementById('other_amenity_text');

    if (amenityOtherCheckbox) {
        amenityOtherCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // Show the text input field
                otherAmenityContainer.classList.add('show');
                otherAmenityInput.required = true;
                otherAmenityInput.focus();
            } else {
                // Hide the text input field
                otherAmenityContainer.classList.remove('show');
                otherAmenityInput.required = false;
                otherAmenityInput.value = '';
            }
            validateForm();
        });

        // Validate when typing in other amenity field
        otherAmenityInput.addEventListener('input', validateForm);
    }

    // ============================================================
    // FORM VALIDATION
    // ============================================================
    function validateForm() {
        let isValid = true;

        // 1. Validate regular required fields (text inputs, time, file)
        const requiredInputs = form.querySelectorAll('input[required]:not([type="checkbox"])');
        requiredInputs.forEach(input => {
            if (!input.value || !input.value.trim()) {
                isValid = false;
            }
        });

        // 2. Validate Categories (at least one must be selected)
        const categoryCheckboxes = form.querySelectorAll('input[name="categories"]:checked');
        const categoryError = document.getElementById('category-error');

        if (categoryCheckboxes.length === 0) {
            categoryError.classList.add('show');
            isValid = false;
        } else {
            categoryError.classList.remove('show');
        }

        // 3. If "Other" category is checked, validate the text input
        if (categoryOtherCheckbox && categoryOtherCheckbox.checked) {
            if (!otherCategoryInput.value || !otherCategoryInput.value.trim()) {
                isValid = false;
            }
        }

        // 4. Validate Payment Methods (at least one must be selected)
        const paymentCheckboxes = form.querySelectorAll('input[name="payment_methods"]:checked');
        const paymentError = document.getElementById('payment-error');

        if (paymentCheckboxes.length === 0) {
            paymentError.classList.add('show');
            isValid = false;
        } else {
            paymentError.classList.remove('show');
        }

        // 5. Validate Amenities (at least one must be selected)
        const amenityCheckboxes = form.querySelectorAll('input[name="amenities"]:checked');
        const amenitiesError = document.getElementById('amenities-error');

        if (amenityCheckboxes.length === 0) {
            amenitiesError.classList.add('show');
            isValid = false;
        } else {
            amenitiesError.classList.remove('show');
        }

        // 6. If "Other" amenity is checked, validate the text input
        if (amenityOtherCheckbox && amenityOtherCheckbox.checked) {
            if (!otherAmenityInput.value || !otherAmenityInput.value.trim()) {
                isValid = false;
            }
        }

        // Enable/disable next button
        nextBtn.disabled = !isValid;
        return isValid;
    }

    // Run validation on any input change
    form.addEventListener('input', validateForm);
    form.addEventListener('change', validateForm);

    // ============================================================
    // BACK BUTTON
    // ============================================================
    backBtn.addEventListener('click', () => {
        window.location.href = '/owner/register/location/';
    });

    // ============================================================
    // NEXT BUTTON - COLLECT ALL DATA
    // ============================================================
    nextBtn.addEventListener('click', () => {
        if (!validateForm()) {
            alert('⚠️ Please fill in all required fields.');
            return;
        }

        // Collect selected categories (IDs only, exclude "other")
        const selectedCategories = Array.from(form.querySelectorAll('input[name="categories"]:checked'))
            .map(el => el.value)
            .filter(val => val !== 'other');  // Remove "other" from IDs

        // Get custom category text if "Other" was selected
        const otherCategory = categoryOtherCheckbox && categoryOtherCheckbox.checked
            ? otherCategoryInput.value.trim()
            : null;

        // Collect selected amenities (IDs only, exclude "other")
        const selectedAmenities = Array.from(form.querySelectorAll('input[name="amenities"]:checked'))
            .map(el => el.value)
            .filter(val => val !== 'other');  // Remove "other" from IDs

        // Get custom amenity text if "Other" was selected
        const otherAmenity = amenityOtherCheckbox && amenityOtherCheckbox.checked
            ? otherAmenityInput.value.trim()
            : null;

        // Collect payment methods
        const paymentMethods = Array.from(form.querySelectorAll('input[name="payment_methods"]:checked'))
            .map(el => el.value);

        // Build details object
        const details = {
            name: form.querySelector('#name').value.trim(),
            address: form.querySelector('#address').value.trim(),
            opening_time: form.querySelector('#opening_time').value,
            closing_time: form.querySelector('#closing_time').value,
            categories: selectedCategories,        // Array of category IDs: ["1", "2", "3"]
            other_category: otherCategory,         // String or null: "Vegan Cafe"
            paymentMethods: paymentMethods,        // Array: ["Cash", "GCash"]
            amenities: selectedAmenities,          // Array of amenity IDs: ["1", "4", "7"]
            other_amenity: otherAmenity           // String or null: "Pet-Friendly"
        };

        console.log('✅ Step 2 Data Collected:', details);

        // Handle image upload
        const fileInput = document.getElementById('establishment_image');
        if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Store image as base64
                sessionStorage.setItem('establishment_image_data', e.target.result);
                // Store all details
                sessionStorage.setItem('establishmentDetails', JSON.stringify(details));
                // Proceed to Step 3
                window.location.href = '/owner/register/credentials/';
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            alert('⚠️ Please upload your establishment image.');
        }
    });

    // Initial validation
    validateForm();
}

/* ============================================================
   STEP 3 – ACCOUNT CREDENTIALS + OTP
   ✅ FIXED: Added CSRF token for OTP request
   ✅ NEW: Added OTP expiry timer and resend functionality
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
        const ok = passwordInput.value.length >= 8 &&
                   passwordInput.value === retypeInput.value &&
                   emailInput.validity.valid;
        sendOtpBtn.disabled = !ok;
    }

    [emailInput, passwordInput, retypeInput].forEach(el => el.addEventListener('input', validateInputs));
    backBtn.addEventListener('click', () => window.location.href = '/owner/register/details/');

    // ✅ Start OTP countdown timer (10 minutes)
    function startOtpTimer() {
        // Clear any existing timer
        if (timerInterval) clearInterval(timerInterval);

        // Set expiry time to 10 minutes from now
        otpExpiryTime = Date.now() + (10 * 60 * 1000);

        timerInterval = setInterval(() => {
            const remaining = otpExpiryTime - Date.now();

            if (remaining <= 0) {
                clearInterval(timerInterval);
                otpTimer.textContent = '0:00';
                otpTimer.style.color = '#dc2626';
                otpTimerLabel.textContent = 'OTP expired!';
                otpTimerContainer.style.background = '#fee2e2';
                otpError.textContent = 'OTP has expired. Please request a new one.';
                document.getElementById('verify-otp-btn').disabled = true;
                resendOtpBtn.disabled = false;
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            otpTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            // Change color to orange when less than 2 minutes
            if (remaining < 120000) {
                otpTimer.style.color = '#f59e0b';
                otpTimerContainer.style.background = '#fef3c7';
            }
        }, 1000);
    }

    // ✅ Start resend cooldown timer (30 seconds)
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

    // ✅ FIXED: Send OTP with CSRF token
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
            console.log('OTP Response:', data);
            if (data.success) {
                otpEmailDisplay.textContent = email;
                otpModal.style.display = 'flex';
                startOtpTimer();
                startResendCooldown();

                // Reset OTP input and error
                document.getElementById('otp-input').value = '';
                otpError.textContent = '';
                document.getElementById('verify-otp-btn').disabled = false;

                // Reset timer styling
                otpTimer.style.color = '#dc2626';
                otpTimerLabel.textContent = 'OTP expires in:';
                otpTimerContainer.style.background = '#f0f9ff';
            } else {
                alert('Failed to send OTP: ' + (data.error || 'Unknown error'));
                console.error('Failed to send OTP:', data.error);
            }
        })
        .catch((err) => {
            console.error('Error sending OTP:', err);
            alert('Network error. Please check your connection.');
        })
        .finally(() => {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP to register establishment';
        });
    }

    sendOtpBtn.addEventListener('click', sendOTP);

    // ✅ Resend OTP button handler
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

                // Restart timers
                startOtpTimer();
                startResendCooldown();

                // Re-enable verify button
                document.getElementById('verify-otp-btn').disabled = false;

                // Reset timer styling
                otpTimer.style.color = '#dc2626';
                otpTimerLabel.textContent = 'OTP expires in:';
                otpTimerContainer.style.background = '#f0f9ff';
            } else {
                otpError.textContent = data.error || 'Failed to resend OTP';
            }
        })
        .catch((err) => {
            console.error('Error resending OTP:', err);
            otpError.textContent = 'Network error. Please try again.';
        })
        .finally(() => {
            resendOtpBtn.disabled = false;
            resendOtpBtn.textContent = 'Resend OTP';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === otpModal) {
            // Don't close modal by clicking outside - user must complete or refresh page
        }
        if (e.target === successModal) successModal.style.display = 'none';
    });

    // ✅ OTP Form Submission (with CSRF)
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

            // Clear timers
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

/* ============================================================
   Helper – Convert Base64 → Blob
   ============================================================ */
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}