/* ============================================================
   KABSU EATS — BUSINESS OWNER REGISTRATION (FULL 3-STEP FLOW)
   Combined with Location Features
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('register/location')) initStep1();
    else if (path.includes('register/details')) initStep2();
    else if (path.includes('register/credentials')) initStep3();
});

/* ============================================================
   STEP 1 — LOCATION PINNING WITH INTEGRATED FEATURES
   ============================================================ */
function initStep1() {
    const nextBtn = document.getElementById('next-step-btn');
    const msg = document.getElementById('validation-message');

    const cvsuLatLng = [CVSU_COORDS.lat, CVSU_COORDS.lng];
    const RADIUS = 500;

    // --- HIGH RESOLUTION MAP LAYERS ---

    // 1. Street Map - OpenStreetMap
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    });

    // 2. High Resolution Satellite - Google Satellite
    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // 3. Hybrid View - Satellite with Labels (DEFAULT)
    const hybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // 4. Terrain Map
    const terrainLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 20
    });

    // Create BaseMaps object for the control
    const baseMaps = {
        "Hybrid (Satellite + Labels)": hybridLayer,
        "Satellite": satelliteLayer,
        "Street": streetLayer,
        "Terrain": terrainLayer
    };

    // Initialize the map with HYBRID as default at ZOOM LEVEL 16
    const map = L.map('map', {
        layers: [hybridLayer],
        maxZoom: 21,
        minZoom: 10
    }).setView(cvsuLatLng, 16);

    // Make map globally accessible
    window.map = map;

    // Add layer control to the map
    L.control.layers(baseMaps).addTo(map);

    // --- CvSU Marker and Radius Circle ---
    L.marker(cvsuLatLng).addTo(map).bindPopup('<b>CvSU-Bacoor Campus</b>').openPopup();
    L.circle(cvsuLatLng, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
        radius: RADIUS
    }).addTo(map);

    // --- Map Click Handler ---
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
                        msg.textContent = '❌ Please pin inside the red circle (within 500m).';
                        msg.className = 'map-validation-message invalid';
                        nextBtn.disabled = true;
                        updateRemovePinButton(false);
                    }
                });
            }
            validatePosition(e.latlng);
        } else {
            msg.textContent = '❌ Please pin inside the red circle (within 500m).';
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

        // Activate remove pin button
        updateRemovePinButton(true);

        // Show location info
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

    // ============================================================
    // INTEGRATED LOCATION FEATURES
    // ============================================================

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

    // ============================================================
    // SEARCH FUNCTIONALITY
    // ============================================================

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
        autocompleteDropdown.innerHTML = '<div class="autocomplete-loading"><span class="spinner"></span>Searching...</div>';
        autocompleteDropdown.classList.add('show');

        const viewbox = `${cvsuLatLngObj.lng - 0.01},${cvsuLatLngObj.lat - 0.01},${cvsuLatLngObj.lng + 0.01},${cvsuLatLngObj.lat + 0.01}`;

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

        results.forEach((result) => {
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

        const distance = map.distance(latlng, cvsuLatLngObj);

        if (distance <= RADIUS) {
            placeMarker(latlng);
            map.setView(latlng, 18);
            searchInput.value = result.display_name.split(',')[0];
        } else {
            showLocationStatus('This location is outside the 500m radius', 'error');
            msg.textContent = '❌ Please select a location within the red circle (within 500m).';
            msg.className = 'map-validation-message invalid';
        }

        autocompleteDropdown.classList.remove('show');
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.classList.remove('show');
        }
    });

    // ============================================================
    // FOCUS ON CVSU BUTTON
    // ============================================================

    focusCvsuBtn.addEventListener('click', () => {
        map.setView(cvsuLatLngObj, 16);
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

                const distance = map.distance(userLatLng, cvsuLatLngObj);

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
        if (!removePinBtn.classList.contains('active')) {
            return; // Button is disabled
        }

        if (window.userMarker) {
            map.removeLayer(window.userMarker);
            window.userMarker = null;

            sessionStorage.removeItem('latitude');
            sessionStorage.removeItem('longitude');

            updateRemovePinButton(false);

            const locationInfo = document.getElementById('location-info');
            if (locationInfo) {
                locationInfo.classList.remove('show');
            }

            msg.textContent = 'Please pin a location on the map.';
            msg.className = 'map-validation-message';
            nextBtn.disabled = true;

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
                const distance = map.distance(pos, cvsuLatLngObj);

                if (distance <= RADIUS) {
                    validatePosition(pos);
                } else {
                    msg.textContent = '❌ Pin must be within the red circle (within 500m).';
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
        setTimeout(() => {
            locationStatus.style.display = 'none';
        }, 3000);
    }
}

/* ============================================================
   STEP 2 — ESTABLISHMENT DETAILS
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

    // Fetch address from coordinates
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

    validateForm();
}

/* ============================================================
   STEP 3 — ACCOUNT CREDENTIALS + OTP
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

    // ✅ FIXED: Faster OTP sending with better feedback
    sendOtpBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();

        if (!email) {
            alert('Please enter your email address');
            return;
        }

        // Validate email format
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        // Disable button and show loading state
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending OTP...';

        try {
            console.log('📤 Sending OTP request to:', email);

            const response = await fetch('/api/send-otp/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email })
            });

            console.log('📥 Response status:', response.status);

            const data = await response.json();
            console.log('📥 Response data:', data);

            if (data.success) {
                console.log('✅ OTP sent successfully');

                // Show success message
                if (data.warning) {
                    alert(`⚠️ ${data.warning}\n\nOTP: ${data.debug_otp || 'Check your email'}`);
                }

                // Open OTP modal
                otpModal.style.display = 'flex';
                document.getElementById('otp-input').focus();

                // Show success notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #4CAF50;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 5px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 10000;
                    animation: slideIn 0.3s ease-out;
                `;
                notification.textContent = '✅ OTP sent to your email!';
                document.body.appendChild(notification);

                setTimeout(() => {
                    notification.style.animation = 'slideOut 0.3s ease-out';
                    setTimeout(() => notification.remove(), 300);
                }, 3000);

            } else {
                console.error('❌ OTP sending failed:', data.error);
                alert(`Failed to send OTP: ${data.error || 'Please try again'}`);
            }
        } catch (error) {
            console.error('❌ Error sending OTP:', error);
            alert('Network error. Please check your connection and try again.');
        } finally {
            // Re-enable button
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP to register establishment';
        }
    });

    // Close modal on background click
    window.addEventListener('click', (e) => {
        if (e.target === otpModal) otpModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
    });

    // ✅ FIXED: OTP verification with proper error handling
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        otpError.textContent = '';
        loading.style.display = 'block';

        try {
            const otpCode = document.getElementById('otp-input').value.trim();

            if (!otpCode || otpCode.length !== 6) {
                throw new Error('Please enter a valid 6-digit OTP');
            }

            const details = JSON.parse(sessionStorage.getItem('establishmentDetails'));
            const lat = sessionStorage.getItem('latitude');
            const lng = sessionStorage.getItem('longitude');
            const imgData = sessionStorage.getItem('establishment_image_data');

            console.log('🔐 Verifying OTP and registering...');

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

            const res = await fetch('/api/verify-and-register/', {
                method: 'POST',
                body: formData
            });

            console.log('📥 Registration response status:', res.status);
            const result = await res.json();
            console.log('📥 Registration response:', result);

            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Registration failed');
            }

            console.log('✅ Registration successful!');

            // Clear session storage
            sessionStorage.clear();

            // Close OTP modal and show success modal
            otpModal.style.display = 'none';
            successModal.style.display = 'flex';

            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = result.redirect_url || '/food_establishment/dashboard/';
            }, 2000);

        } catch (err) {
            console.error('❌ Registration error:', err);
            otpError.textContent = err.message;
            otpError.style.color = 'red';
            otpError.style.marginTop = '10px';
        } finally {
            loading.style.display = 'none';
        }
    });
}

/* ============================================================
   Helper — Convert Base64 → Blob
   ============================================================ */
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}
/* ============================================================
   CSS Animations for Notifications
   ============================================================ */
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);