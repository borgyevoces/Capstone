/* ============================================================
   LOCATION FEATURES - SEARCH, CURRENT LOCATION, FOCUS CVSU, REMOVE PIN
   This file ADDS features to the existing map without interfering with it
   ============================================================ */

// Wait for the DOM and map to be ready
window.addEventListener('load', () => {
    if (!window.location.pathname.includes('register/location')) return;

    // Wait a moment for map initialization
    const checkMap = setInterval(() => {
        if (window.map) {
            clearInterval(checkMap);
            initLocationFeatures();
        }
    }, 100);
});

function initLocationFeatures() {
    const searchInput = document.getElementById('location-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
    const focusCvsuBtn = document.getElementById('focus-cvsu-btn');
    const useLocationBtn = document.getElementById('use-current-location-btn');
    const removePinBtn = document.getElementById('remove-pin-btn');
    const locationStatus = document.getElementById('location-status');

    const CVSU_COORDS = {
        lat: 14.412657,
        lng: 120.981290
    };
    const RADIUS = 500;

    let searchTimeout;
    let currentSelectedIndex = -1;

    // ============================================================
    // SEARCH AUTOCOMPLETE FUNCTIONALITY
    // ============================================================

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (query.length > 0) {
            clearSearchBtn.classList.add('show');
        } else {
            clearSearchBtn.classList.remove('show');
            autocompleteDropdown.classList.remove('show');
            return;
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 3) {
                searchLocation(query);
            }
        }, 300);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('show');
        autocompleteDropdown.classList.remove('show');
        currentSelectedIndex = -1;
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSelectedIndex = Math.min(currentSelectedIndex + 1, items.length - 1);
            updateActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSelectedIndex = Math.max(currentSelectedIndex - 1, -1);
            updateActiveItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSelectedIndex >= 0 && items[currentSelectedIndex]) {
                items[currentSelectedIndex].click();
            }
        } else if (e.key === 'Escape') {
            autocompleteDropdown.classList.remove('show');
            currentSelectedIndex = -1;
        }
    });

    function updateActiveItem(items) {
        items.forEach((item, index) => {
            if (index === currentSelectedIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    async function searchLocation(query) {
        autocompleteDropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
        autocompleteDropdown.classList.add('show');

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `format=json&q=${encodeURIComponent(query)}&` +
                `lat=${CVSU_COORDS.lat}&lon=${CVSU_COORDS.lng}&` +
                `bounded=1&viewbox=${CVSU_COORDS.lng - 0.05},${CVSU_COORDS.lat - 0.05},${CVSU_COORDS.lng + 0.05},${CVSU_COORDS.lat + 0.05}&` +
                `limit=10`
            );

            const results = await response.json();

            if (results.length === 0) {
                autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No results found near CvSU</div>';
                return;
            }

            autocompleteDropdown.innerHTML = '';
            currentSelectedIndex = -1;

            results.forEach((result) => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerHTML = `
                    <div class="autocomplete-name">${result.display_name.split(',')[0]}</div>
                    <div class="autocomplete-address">${result.display_name}</div>
                `;

                item.addEventListener('click', () => {
                    selectLocation(result);
                });

                autocompleteDropdown.appendChild(item);
            });

        } catch (error) {
            console.error('Search error:', error);
            autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">Search failed. Please try again.</div>';
        }
    }

    function selectLocation(result) {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const latlng = L.latLng(lat, lng);

        const distance = window.map.distance(latlng, [CVSU_COORDS.lat, CVSU_COORDS.lng]);

        if (distance > RADIUS) {
            showStatus('error', 'Location is outside the 500m radius. Please select within the red circle.');
            return;
        }

        searchInput.value = result.display_name.split(',')[0];
        autocompleteDropdown.classList.remove('show');

        window.map.setView(latlng, 18);

        // Use the existing marker creation logic by simulating a map click
        placeMarkerAt(latlng);

        showStatus('success', 'Location pinned successfully!');
    }

    // Helper function to place marker (reuses existing logic)
    function placeMarkerAt(latlng) {
        const msg = document.getElementById('validation-message');
        const nextBtn = document.getElementById('next-step-btn');

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
            }).addTo(window.map);

            window.userMarker.on('dragend', (evt) => {
                const pos = evt.target.getLatLng();
                const dist = window.map.distance(pos, [CVSU_COORDS.lat, CVSU_COORDS.lng]);

                if (dist <= RADIUS) {
                    sessionStorage.setItem('latitude', pos.lat);
                    sessionStorage.setItem('longitude', pos.lng);
                    msg.textContent = '✅ Location pinned successfully!';
                    msg.className = 'map-validation-message valid';
                    nextBtn.disabled = false;

                    removePinBtn.style.display = 'inline-flex';

                    const locationInfo = document.getElementById('location-info');
                    const locationCoords = document.getElementById('location-coords');
                    if (locationInfo && locationCoords) {
                        locationCoords.textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
                        locationInfo.classList.add('show');
                    }
                } else {
                    msg.textContent = '❌ Please pin inside the red circle (within 500m).';
                    msg.className = 'map-validation-message invalid';
                    nextBtn.disabled = true;
                }
            });
        }

        // Validate the position
        sessionStorage.setItem('latitude', latlng.lat);
        sessionStorage.setItem('longitude', latlng.lng);
        msg.textContent = '✅ Location pinned successfully!';
        msg.className = 'map-validation-message valid';
        nextBtn.disabled = false;

        removePinBtn.style.display = 'inline-flex';

        const locationInfo = document.getElementById('location-info');
        const locationCoords = document.getElementById('location-coords');
        if (locationInfo && locationCoords) {
            locationCoords.textContent = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
            locationInfo.classList.add('show');
        }
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.classList.remove('show');
            currentSelectedIndex = -1;
        }
    });

    // ============================================================
    // FOCUS ON CVSU BUTTON
    // ============================================================

    focusCvsuBtn.addEventListener('click', () => {
        window.map.setView([CVSU_COORDS.lat, CVSU_COORDS.lng], 16);
        showStatus('success', 'Focused on CvSU Bacoor');
    });

    // ============================================================
    // USE CURRENT LOCATION BUTTON
    // ============================================================

    useLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showStatus('error', 'Geolocation is not supported by your browser');
            return;
        }

        showStatus('loading', 'Getting your location...');
        useLocationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const latlng = L.latLng(lat, lng);

                const distance = window.map.distance(latlng, [CVSU_COORDS.lat, CVSU_COORDS.lng]);

                if (distance > RADIUS) {
                    showStatus('error', `You are ${Math.round(distance)}m away from CvSU. Please be within 500m.`);
                    useLocationBtn.disabled = false;
                    return;
                }

                window.map.setView(latlng, 18);
                placeMarkerAt(latlng);

                showStatus('success', 'Location set successfully!');
                useLocationBtn.disabled = false;
            },
            (error) => {
                let errorMsg = 'Unable to get your location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'Location request timed out';
                        break;
                }
                showStatus('error', errorMsg);
                useLocationBtn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });

    // ============================================================
    // REMOVE PIN BUTTON
    // ============================================================

    removePinBtn.addEventListener('click', () => {
        if (window.userMarker) {
            window.map.removeLayer(window.userMarker);
            window.userMarker = null;
        }

        sessionStorage.removeItem('latitude');
        sessionStorage.removeItem('longitude');

        const msg = document.getElementById('validation-message');
        const nextBtn = document.getElementById('next-step-btn');
        msg.textContent = 'Please pin a location on the map.';
        msg.className = 'map-validation-message';
        nextBtn.disabled = true;

        removePinBtn.style.display = 'none';

        const locationInfo = document.getElementById('location-info');
        if (locationInfo) {
            locationInfo.classList.remove('show');
        }

        showStatus('success', 'Pin removed');
    });

    // ============================================================
    // STATUS MESSAGE HELPER
    // ============================================================

    function showStatus(type, message) {
        locationStatus.style.display = 'inline-block';
        locationStatus.className = `location-status ${type}`;

        if (type === 'loading') {
            locationStatus.innerHTML = `<span class="spinner"></span>${message}`;
        } else {
            locationStatus.textContent = message;
        }

        if (type !== 'loading') {
            setTimeout(() => {
                locationStatus.style.display = 'none';
            }, 3000);
        }
    }
}