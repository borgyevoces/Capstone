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

    // Show existing registered establishments on map with their images
    if (typeof EXISTING_ESTABLISHMENTS !== 'undefined' && EXISTING_ESTABLISHMENTS) {
        EXISTING_ESTABLISHMENTS.forEach(est => {
            if (est.latitude && est.longitude) {
                // Use establishment image if available, otherwise use default marker
                const imageUrl = est.image || 'https://via.placeholder.com/50x50?text=Est';

                const estIcon = L.divIcon({
                    className: 'existing-establishment-marker',
                    html: `
                        <div style="
                            position: relative;
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            overflow: hidden;
                            border: 3px solid #4CAF50;
                            background: white;
                            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                            cursor: pointer;
                        ">
                            <img src="${imageUrl}"
                                 alt="${est.name}"
                                 style="
                                    width: 100%;
                                    height: 100%;
                                    object-fit: cover;
                                 "
                                 onerror="this.src='https://via.placeholder.com/50x50?text=Est';"
                            />
                        </div>
                    `,
                    iconSize: [50, 50],
                    iconAnchor: [25, 25],
                    popupAnchor: [0, -25]
                });

                const marker = L.marker([est.latitude, est.longitude], {
                    icon: estIcon
                }).addTo(map);

                // Add popup with establishment info
                marker.bindPopup(`
                    <div style="text-align: center; padding: 5px;">
                        <strong style="color: #4CAF50; font-size: 14px;">${est.name}</strong><br>
                        <small style="color: #666;">${est.category__name || 'Restaurant'}</small><br>
                        <small style="color: #888;">${est.address || ''}</small>
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

        // Enhanced search with addressdetails for better results
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=10&addressdetails=1&extratags=1`)
            .then(res => res.json())
            .then(data => {
                // Filter results to only show those within the 500m radius
                const filteredResults = data.filter(result => {
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    const latlng = L.latLng(lat, lng);
                    const distance = map.distance(latlng, cvsuLatLngObj);
                    return distance <= RADIUS;
                });
                displaySearchResults(filteredResults);
            })
            .catch(err => {
                console.error('Search error:', err);
                autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">Search failed. Please try again.</div>';
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
            const name = result.display_name.split(',')[0];
            const address = result.display_name;

            item.innerHTML = `
                <div class="autocomplete-name">${name}</div>
                <div class="autocomplete-address">${address}</div>
            `;
            item.addEventListener('click', () => selectSearchResult(result, name));
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
            showLocationStatus('Geolocation is not supported by your browser', 'error');
            return;
        }

        showLocationStatus('Getting your location...', 'loading');
        useCurrentLocationBtn.disabled = true;

        // Optimized for fast, accurate, real-time location
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 5000,           // 5 seconds timeout for quick response
            maximumAge: 0            // Always get fresh position
        };

        let positionWatchId = null;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                const userLatLng = L.latLng(lat, lng);
                const distance = map.distance(userLatLng, cvsuLatLngObj);

                console.log(`GPS Lock: Accuracy ±${accuracy.toFixed(0)}m, Distance: ${distance.toFixed(0)}m`);

                if (distance <= RADIUS) {
                    placeMarker(userLatLng);
                    map.setView(userLatLng, 18);
                    showLocationStatus(`📍 Location set! (Accuracy: ±${accuracy.toFixed(0)}m)`, 'success');

                    // Start watching position for real-time updates
                    if (!positionWatchId) {
                        positionWatchId = navigator.geolocation.watchPosition(
                            (pos) => {
                                const newLat = pos.coords.latitude;
                                const newLng = pos.coords.longitude;
                                const newLatLng = L.latLng(newLat, newLng);
                                const newDistance = map.distance(newLatLng, cvsuLatLngObj);

                                if (newDistance <= RADIUS && window.userMarker) {
                                    // Update marker position in real-time
                                    window.userMarker.setLatLng(newLatLng);
                                    validatePosition(newLatLng);
                                }
                            },
                            (err) => console.warn('Watch position error:', err),
                            { enableHighAccuracy: true, maximumAge: 1000 }
                        );

                        // Store watchId to clear later if needed
                        window.locationWatchId = positionWatchId;
                    }
                } else {
                    showLocationStatus(`You are ${Math.round(distance)}m from CvSU (limit: 500m)`, 'error');
                    msg.textContent = '❌ Your current location is outside the allowed area.';
                    msg.className = 'map-validation-message invalid';
                }
                useCurrentLocationBtn.disabled = false;
            },
            (error) => {
                let errorMsg = 'Unable to get your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = '❌ Location permission denied. Please enable location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = '❌ Location unavailable. Move to an open area with GPS signal.';
                        break;
                    case error.TIMEOUT:
                        errorMsg = '⏱️ Location timeout. Please try again.';
                        break;
                }
                showLocationStatus(errorMsg, 'error');
                useCurrentLocationBtn.disabled = false;
                console.error('Geolocation error:', error);
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

            // Stop watching position if active
            if (window.locationWatchId) {
                navigator.geolocation.clearWatch(window.locationWatchId);
                window.locationWatchId = null;
            }

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
        locationStatus.textContent = message;
        locationStatus.className = `location-status ${type}`;
        locationStatus.style.display = 'inline-block';
        if (type === 'loading') {
            locationStatus.innerHTML = `<span class="spinner"></span>${message}`;
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
function initStep2() {
    if (!sessionStorage.getItem('latitude')) {
        console.warn('Please complete Step 1 first. Redirecting...');
        window.location.href = '/owner/register/location/';
        return;
    }

    const form = document.getElementById('details-form');
    const nextBtn = document.getElementById('next-step-btn');
    const backBtn = document.getElementById('back-step-btn');
    const addressInput = document.getElementById('address');
    const lat = sessionStorage.getItem('latitude');
    const lng = sessionStorage.getItem('longitude');

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) addressInput.value = data.display_name;
            validateForm();
        })
        .catch(err => {
            console.error("Error fetching address: ", err);
            addressInput.value = "Could not fetch address. Please check connection.";
            validateForm();
        });

    const requiredFields = Array.from(form.querySelectorAll('[required]'));

    function validateForm() {
        const isFilled = requiredFields.every(f => f.value.trim() !== '');
        const paymentChecked = form.querySelectorAll('input[name="payment_methods"]:checked').length > 0;
        const amenitiesChecked = form.querySelectorAll('input[name="amenities"]:checked').length > 0;
        nextBtn.disabled = !(isFilled && paymentChecked && amenitiesChecked);
    }

    form.addEventListener('input', validateForm);
    form.addEventListener('change', validateForm);
    backBtn.addEventListener('click', () => window.location.href = '/owner/register/location/');

    nextBtn.addEventListener('click', () => {
        const details = {
    name: form.querySelector('#name').value.trim(),
    address: form.querySelector('#address').value.trim(),
    opening_time: form.querySelector('#opening_time').value,  // ✅ Changed
    closing_time: form.querySelector('#closing_time').value,   // ✅ Added
    category: form.querySelector('#category').value,
    paymentMethods: Array.from(form.querySelectorAll('input[name="payment_methods"]:checked')).map(el => el.value),
    amenities: Array.from(form.querySelectorAll('input[name="amenities"]:checked')).map(el => el.value)
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
            console.error('Please upload your establishment image.');
        }
    });

    validateForm();
}

/* ============================================================
   STEP 3 – ACCOUNT CREDENTIALS + OTP
   ✅ FIXED: Added CSRF token for OTP request
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

    function validateInputs() {
        const ok = passwordInput.value.length >= 8 &&
                   passwordInput.value === retypeInput.value &&
                   emailInput.validity.valid;
        sendOtpBtn.disabled = !ok;
    }

    [emailInput, passwordInput, retypeInput].forEach(el => el.addEventListener('input', validateInputs));
    backBtn.addEventListener('click', () => window.location.href = '/owner/register/details/');

    // ✅ FIXED: Send OTP with CSRF token
    sendOtpBtn.addEventListener('click', () => {
        const email = emailInput.value;
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';

        const csrftoken = getCookie('csrftoken');

        fetch('/api/send-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken  // ✅ Added CSRF token
            },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            console.log('OTP Response:', data);  // Debug log
            if (data.success) {
                otpModal.style.display = 'flex';  // ✅ Should work now!
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
    });

    window.addEventListener('click', (e) => {
        if (e.target === otpModal) otpModal.style.display = 'none';
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
                    'X-CSRFToken': csrftoken  // ✅ Added CSRF token
                }
            });

            const result = await res.json();

            if (!res.ok || !result.success) throw new Error(result.error || 'Registration failed.');

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