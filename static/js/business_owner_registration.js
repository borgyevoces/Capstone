/* ============================================================
   KABSU EATS – BUSINESS OWNER REGISTRATION (MERGED LOGIC)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // Detect functionality based on URL path or specific elements present
    if (document.getElementById('map') && document.getElementById('location-search')) {
        initStep1_Location();
    } else if (path.includes('register/details') || document.getElementById('details-form')) {
        initStep2_Details();
    } else if (path.includes('register/credentials') || document.getElementById('otpForm')) {
        initStep3_Credentials();
    }
});

/* ============================================================
   STEP 1 – LOCATION PINNING & FEATURES
   ============================================================ */
function initStep1_Location() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // UI Elements
    const searchInput = document.getElementById('location-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const autocompleteDropdown = document.getElementById('autocomplete-dropdown');

    // Buttons
    const focusCvsuBtn = document.getElementById('focus-cvsu-btn');
    const useCurrentLocationBtn = document.getElementById('use-current-location-btn');
    const removePinBtn = document.getElementById('remove-pin-btn');

    // Status & Validation
    const locationStatus = document.getElementById('location-status');
    const msg = document.getElementById('validation-message');
    const nextBtn = document.getElementById('next-step-btn');
    const locationInfo = document.getElementById('location-info');
    const locationCoords = document.getElementById('location-coords');

    // Constants
    const cvsuLatLng = L.latLng(CVSU_COORDS.lat, CVSU_COORDS.lng);
    const RADIUS = 500;
    let searchTimeout;

    // --- MAP INITIALIZATION (Preserving all original layers) ---

    // 1. Street Map
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    });

    // 2. High Resolution Satellite
    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google', maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // 3. Hybrid View (Default)
    const hybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google', maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // 4. Terrain Map
    const terrainLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google', maxZoom: 20
    });

    const baseMaps = {
        "Hybrid (Satellite + Labels)": hybridLayer,
        "Satellite": satelliteLayer,
        "Street": streetLayer,
        "Terrain": terrainLayer
    };

    const map = L.map('map', {
        layers: [hybridLayer], // Default to Hybrid
        maxZoom: 21,
        minZoom: 14 // Locked min zoom slightly to keep context
    }).setView(cvsuLatLng, 16);

    // Make map globally accessible
    window.map = map;

    L.control.layers(baseMaps).addTo(map);

    // CvSU Marker & Circle
    L.marker(cvsuLatLng).addTo(map).bindPopup('<b>CvSU-Bacoor Campus</b>').openPopup();
    L.circle(cvsuLatLng, {
        color: 'red', fillColor: '#f03', fillOpacity: 0.2, radius: RADIUS
    }).addTo(map);

    // --- INITIAL STATE CHECK ---
    if (sessionStorage.getItem('latitude') && sessionStorage.getItem('longitude')) {
        const savedLat = parseFloat(sessionStorage.getItem('latitude'));
        const savedLng = parseFloat(sessionStorage.getItem('longitude'));
        const savedPos = L.latLng(savedLat, savedLng);

        placeMarker(savedPos);
        map.setView(savedPos, 18);
    } else {
        updateButtonStyles(false); // Default style (Solid)
    }

    // --- MAP CLICK HANDLER ---
    map.on('click', (e) => {
        const distance = map.distance(e.latlng, cvsuLatLng);
        if (distance <= RADIUS) {
            placeMarker(e.latlng);
        } else {
            showError('❌ Please pin inside the red circle (within 500m).');
        }
    });

    // --- SEARCH FUNCTIONALITY ---
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) clearSearchBtn.classList.add('show');
        else {
            clearSearchBtn.classList.remove('show');
            autocompleteDropdown.classList.remove('show');
            return;
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) performSearch(query);
        }, 300);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.remove('show');
        autocompleteDropdown.classList.remove('show');
        searchInput.focus();
    });

    function performSearch(query) {
        autocompleteDropdown.innerHTML = '<div class="autocomplete-loading"><span class="spinner"></span>Searching...</div>';
        autocompleteDropdown.classList.add('show');

        // Search bound to CvSU area
        const viewbox = `${cvsuLatLng.lng - 0.01},${cvsuLatLng.lat - 0.01},${cvsuLatLng.lng + 0.01},${cvsuLatLng.lat + 0.01}`;

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=5`)
            .then(res => res.json())
            .then(data => displaySearchResults(data))
            .catch(() => {
                autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">Search failed.</div>';
            });
    }

    function displaySearchResults(results) {
        if (results.length === 0) {
            autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No results found near CvSU</div>';
            return;
        }
        autocompleteDropdown.innerHTML = '';
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="autocomplete-name">${result.display_name.split(',')[0]}</div>
                <div class="autocomplete-address">${result.display_name}</div>
            `;
            item.addEventListener('click', () => {
                const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
                if (map.distance(latlng, cvsuLatLng) <= RADIUS) {
                    placeMarker(latlng);
                    map.setView(latlng, 18);
                    searchInput.value = result.display_name.split(',')[0];
                } else {
                    showError('❌ Location is outside the 500m radius.');
                }
                autocompleteDropdown.classList.remove('show');
            });
            autocompleteDropdown.appendChild(item);
        });
    }

    // --- BUTTON ACTIONS ---

    // 1. Focus CvSU
    focusCvsuBtn.addEventListener('click', () => {
        map.setView(cvsuLatLng, 16);
    });

    // 2. Use Current Location
    useCurrentLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showStatus('Geolocation not supported', 'error');
            return;
        }
        showStatus('Locating...', 'loading');
        useCurrentLocationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
                if (map.distance(userLatLng, cvsuLatLng) <= RADIUS) {
                    placeMarker(userLatLng);
                    map.setView(userLatLng, 18);
                    showStatus('Location found!', 'success');
                } else {
                    showError('❌ You are outside the allowed area.');
                    showStatus('Outside area', 'error');
                }
                useCurrentLocationBtn.disabled = false;
            },
            (err) => {
                showStatus('Location error', 'error');
                useCurrentLocationBtn.disabled = false;
            },
            { enableHighAccuracy: true }
        );
    });

    // 3. Remove Pin
    removePinBtn.addEventListener('click', () => {
        if (window.userMarker) {
            map.removeLayer(window.userMarker);
            window.userMarker = null;
            sessionStorage.removeItem('latitude');
            sessionStorage.removeItem('longitude');

            msg.textContent = 'Please pin a location on the map.';
            msg.className = 'map-validation-message';
            nextBtn.disabled = true;

            // Clear info
            if (locationCoords) locationCoords.textContent = '';
            if (locationInfo) locationInfo.style.display = 'none';

            // Revert button styles to solid (default)
            updateButtonStyles(false);
            showStatus('Pin removed', 'success');
        }
    });

    // --- HELPER FUNCTIONS ---

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
                if (map.distance(pos, cvsuLatLng) <= RADIUS) {
                    validatePosition(pos);
                } else {
                    showError('❌ Pin moved outside allowed area.');
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

        if (locationCoords) locationCoords.textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
        if (locationInfo) locationInfo.style.display = 'block';

        updateButtonStyles(true); // Switch to "Light" mode because we have a pin
    }

    // Toggle button styles based on whether a pin exists
    function updateButtonStyles(isPinned) {
        if (isPinned) {
            // Enable Remove Pin
            removePinBtn.disabled = false;
            removePinBtn.classList.remove('btn-disabled');

            // Make Focus & Location buttons "Light Mode" (Outline)
            focusCvsuBtn.classList.add('btn-light-mode');
            useCurrentLocationBtn.classList.add('btn-light-mode');
        } else {
            // Disable Remove Pin
            removePinBtn.disabled = true;
            removePinBtn.classList.add('btn-disabled');

            // Make Focus & Location buttons "Solid Mode" (Default)
            focusCvsuBtn.classList.remove('btn-light-mode');
            useCurrentLocationBtn.classList.remove('btn-light-mode');
        }
    }

    function showError(message) {
        msg.textContent = message;
        msg.className = 'map-validation-message invalid';
        nextBtn.disabled = true;
    }

    function showStatus(message, type) {
        locationStatus.textContent = message;
        locationStatus.className = `location-status ${type}`;
        locationStatus.style.display = 'inline-block';
        setTimeout(() => { locationStatus.style.display = 'none'; }, 3000);
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.classList.remove('show');
        }
    });
}

/* ============================================================
   STEP 2 – ESTABLISHMENT DETAILS (Preserved)
   ============================================================ */
function initStep2_Details() {
    if (!sessionStorage.getItem('latitude')) {
        console.warn('Please complete Step 1 first. Redirecting...');
        window.location.href = '/owner/register/location/';
        return;
    }

    const form = document.getElementById('details-form');
    const nextBtn = document.getElementById('next-step-btn');
    const backBtn = document.getElementById('back-step-btn');
    const addressInput = document.getElementById('address');

    // Auto-fill address
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

    function validateForm() {
        const requiredFields = Array.from(form.querySelectorAll('[required]'));
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
            status: form.querySelector('#status').value,
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

    // Initial validation check
    validateForm();
}

/* ============================================================
   STEP 3 – ACCOUNT CREDENTIALS + OTP (Preserved)
   ============================================================ */
function initStep3_Credentials() {
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

    sendOtpBtn.addEventListener('click', () => {
        const email = emailInput.value;
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';

        fetch('/api/send-otp/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    otpModal.style.display = 'flex';
                } else {
                    console.error('Failed to send OTP:', data.error);
                }
            })
            .catch((err) => console.error('Error sending OTP:', err))
            .finally(() => {
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = 'Send OTP to register establishment';
            });
    });

    // Modal Close Logic
    window.addEventListener('click', (e) => {
        if (e.target === otpModal) otpModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
    });

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

            const res = await fetch('/api/verify-and-register/', { method: 'POST', body: formData });
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
   Helper – Convert Base64 → Blob (Preserved)
   ============================================================ */
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}