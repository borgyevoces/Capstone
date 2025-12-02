/* ============================================================
   LOCATION FEATURES - Search, Focus CvSU, Current Location, Remove Pin
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // Only initialize on Step 1 (location page)
    if (path.includes('register/location')) {
        initLocationFeatures();
    }
});

function initLocationFeatures() {
    // Wait for map to be initialized
    const checkMap = setInterval(() => {
        if (window.map && window.map._loaded) {
            clearInterval(checkMap);
            setupLocationFeatures();
        }
    }, 100);
}

function setupLocationFeatures() {
    const map = window.map;
    const searchInput = document.getElementById('location-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
    const focusCvsuBtn = document.getElementById('focus-cvsu-btn');
    const useCurrentLocationBtn = document.getElementById('use-current-location-btn');
    const removePinBtn = document.getElementById('remove-pin-btn');
    const locationStatus = document.getElementById('location-status');
    const msg = document.getElementById('validation-message');
    const nextBtn = document.getElementById('next-step-btn');

    const cvsuLatLng = L.latLng(CVSU_COORDS.lat, CVSU_COORDS.lng);
    const RADIUS = 500;

    let searchTimeout;
    let currentSelectedIndex = -1;

    // ============================================================
    // SEARCH FUNCTIONALITY
    // ============================================================

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Show/hide clear button
        if (query.length > 0) {
            clearSearchBtn.classList.add('show');
        } else {
            clearSearchBtn.classList.remove('show');
            autocompleteDropdown.classList.remove('show');
            autocompleteDropdown.innerHTML = '';
            return;
        }

        // Debounce search
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query);
            }
        }, 300);
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('show');
        autocompleteDropdown.classList.remove('show');
        autocompleteDropdown.innerHTML = '';
        searchInput.focus();
    });

    // Keyboard navigation for autocomplete
    searchInput.addEventListener('keydown', (e) => {
        const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSelectedIndex = Math.min(currentSelectedIndex + 1, items.length - 1);
            updateSelectedItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSelectedIndex = Math.max(currentSelectedIndex - 1, -1);
            updateSelectedItem(items);
        } else if (e.key === 'Enter' && currentSelectedIndex >= 0) {
            e.preventDefault();
            items[currentSelectedIndex].click();
        } else if (e.key === 'Escape') {
            autocompleteDropdown.classList.remove('show');
            currentSelectedIndex = -1;
        }
    });

    function updateSelectedItem(items) {
        items.forEach((item, index) => {
            if (index === currentSelectedIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    function performSearch(query) {
        // Show loading
        autocompleteDropdown.innerHTML = '<div class="autocomplete-loading"><span class="spinner"></span>Searching...</div>';
        autocompleteDropdown.classList.add('show');

        // Search near CvSU Bacoor with bounded box
        const viewbox = `${cvsuLatLng.lng - 0.01},${cvsuLatLng.lat - 0.01},${cvsuLatLng.lng + 0.01},${cvsuLatLng.lat + 0.01}`;

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=10`)
            .then(res => res.json())
            .then(data => {
                displaySearchResults(data);
            })
            .catch(err => {
                console.error('Search error:', err);
                autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">Search failed. Please try again.</div>';
            });
    }

    function displaySearchResults(results) {
        currentSelectedIndex = -1;

        if (results.length === 0) {
            autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No results found near CvSU</div>';
            return;
        }

        autocompleteDropdown.innerHTML = '';

        results.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="autocomplete-name">${result.display_name.split(',')[0]}</div>
                <div class="autocomplete-address">${result.display_name}</div>
            `;

            item.addEventListener('click', () => {
                selectSearchResult(result);
            });

            autocompleteDropdown.appendChild(item);
        });
    }

    function selectSearchResult(result) {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const latlng = L.latLng(lat, lng);

        // Check if within radius
        const distance = map.distance(latlng, cvsuLatLng);

        if (distance <= RADIUS) {
            // Place marker
            placeMarker(latlng);

            // Pan to location
            map.setView(latlng, 18);

            // Update search input
            searchInput.value = result.display_name.split(',')[0];
        } else {
            showLocationStatus('This location is outside the 500m radius', 'error');
            msg.textContent = '❌ Please select a location within the red circle (within 500m).';
            msg.className = 'map-validation-message invalid';
        }

        // Hide dropdown
        autocompleteDropdown.classList.remove('show');
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.classList.remove('show');
        }
    });

    // ============================================================
    // FOCUS ON CVSU BUTTON
    // ============================================================

    focusCvsuBtn.addEventListener('click', () => {
        map.setView(cvsuLatLng, 16);
        focusCvsuBtn.disabled = true;

        setTimeout(() => {
            focusCvsuBtn.disabled = false;
        }, 500);
    });

    // ============================================================
    // USE CURRENT LOCATION BUTTON
    // ============================================================

    useCurrentLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showLocationStatus('Geolocation is not supported by your browser', 'error');
            return;
        }

        showLocationStatus('Getting your location...', 'loading');
        useCurrentLocationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const userLatLng = L.latLng(lat, lng);

                // Check if within radius
                const distance = map.distance(userLatLng, cvsuLatLng);

                if (distance <= RADIUS) {
                    placeMarker(userLatLng);
                    map.setView(userLatLng, 18);
                    showLocationStatus('Location set successfully!', 'success');
                } else {
                    showLocationStatus('You are outside the 500m radius from CvSU', 'error');
                    msg.textContent = '❌ Your current location is outside the allowed area.';
                    msg.className = 'map-validation-message invalid';
                }

                useCurrentLocationBtn.disabled = false;
            },
            (error) => {
                let errorMsg = 'Unable to get your location';
                switch(error.code) {
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
                showLocationStatus(errorMsg, 'error');
                useCurrentLocationBtn.disabled = false;
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
            map.removeLayer(window.userMarker);
            window.userMarker = null;

            // Clear session storage
            sessionStorage.removeItem('latitude');
            sessionStorage.removeItem('longitude');

            // Hide remove button
            removePinBtn.style.display = 'none';

            // Hide location info
            const locationInfo = document.getElementById('location-info');
            if (locationInfo) {
                locationInfo.classList.remove('show');
            }

            // Reset validation message
            msg.textContent = 'Please pin a location on the map.';
            msg.className = 'map-validation-message';
            nextBtn.disabled = true;

            // Clear search input
            searchInput.value = '';
            clearSearchBtn.classList.remove('show');

            showLocationStatus('Pin removed', 'success');
            setTimeout(() => {
                hideLocationStatus();
            }, 2000);
        }
    });

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

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
                const distance = map.distance(pos, cvsuLatLng);

                if (distance <= RADIUS) {
                    validatePosition(pos);
                } else {
                    // Snap back to previous valid position or remove
                    msg.textContent = '❌ Pin must be within the red circle (within 500m).';
                    msg.className = 'map-validation-message invalid';
                    nextBtn.disabled = true;
                }
            });
        }
        validatePosition(latlng);
    }

    function validatePosition(pos) {
        sessionStorage.setItem('latitude', pos.lat);
        sessionStorage.setItem('longitude', pos.lng);
        msg.textContent = '✓ Location pinned successfully!';
        msg.className = 'map-validation-message valid';
        nextBtn.disabled = false;

        // Show remove pin button
        removePinBtn.style.display = 'inline-flex';

        // Show location info
        const locationInfo = document.getElementById('location-info');
        const locationCoords = document.getElementById('location-coords');
        if (locationInfo && locationCoords) {
            locationCoords.textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
            locationInfo.classList.add('show');
        }

        hideLocationStatus();
    }

    function showLocationStatus(message, type) {
        locationStatus.textContent = message;
        locationStatus.className = `location-status ${type}`;
        locationStatus.style.display = 'inline-block';

        if (type === 'loading') {
            locationStatus.innerHTML = `<span class="spinner"></span>${message}`;
        }
    }

    function hideLocationStatus() {
        setTimeout(() => {
            locationStatus.style.display = 'none';
        }, 3000);
    }
}