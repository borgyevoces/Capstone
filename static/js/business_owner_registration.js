/* ============================================================
   KABSU EATS â€“ BUSINESS OWNER REGISTRATION (FULL 3-STEP FLOW)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('register/location')) initStep1();
    else if (path.includes('register/details')) initStep2();
    else if (path.includes('register/credentials')) initStep3();
});

/* ============================================================
   STEP 1 â€“ LOCATION PINNING
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

    // 2. High Resolution Satellite - Google Satellite (works up to zoom 21)
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

    // 2. Create BaseMaps object for the control
    const baseMaps = {
        "Hybrid (Satellite + Labels)": hybridLayer,
        "Satellite": satelliteLayer,
        "Street": streetLayer,
        "Terrain": terrainLayer
    };

    // 3. Initialize the map with HYBRID as default at ZOOM LEVEL 16
    const map = L.map('map', {
        layers: [hybridLayer], // Default to hybrid view with labels
        maxZoom: 21,
        minZoom: 10
    }).setView(cvsuLatLng, 16); // Zoom level 16 - shows entire area with red circle and surroundings

    // Make map globally accessible
    window.map = map;

    // 4. Add layer control to the map
    L.control.layers(baseMaps).addTo(map);

    // --- CvSU Marker and Radius Circle ---
    L.marker(cvsuLatLng).addTo(map).bindPopup('<b>CvSU-Bacoor Campus</b>').openPopup();
    L.circle(cvsuLatLng, { color: 'red', fillColor: '#f03', fillOpacity: 0.2, radius: RADIUS }).addTo(map);

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
                window.userMarker.on('dragend', (evt) => validatePosition(evt.target.getLatLng()));
            }
            validatePosition(e.latlng);
        } else {
            msg.textContent = 'âŒ Please pin inside the red circle (within 500m).';
            msg.className = 'map-validation-message invalid';
            nextBtn.disabled = true;
        }
    });

    function validatePosition(pos) {
        sessionStorage.setItem('latitude', pos.lat);
        sessionStorage.setItem('longitude', pos.lng);
        msg.textContent = 'âœ… Location pinned successfully!';
        msg.className = 'map-validation-message valid';
        nextBtn.disabled = false;

        // Show remove pin button
        const removePinBtn = document.getElementById('remove-pin-btn');
        if (removePinBtn) {
            removePinBtn.style.display = 'inline-flex';
        }

        // Show location info
        const locationInfo = document.getElementById('location-info');
        const locationCoords = document.getElementById('location-coords');
        if (locationInfo && locationCoords) {
            locationCoords.textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
            locationInfo.classList.add('show');
        }
    }

    nextBtn.addEventListener('click', () => {
        window.location.href = '/owner/register/details/';
    });
}

/* ============================================================
   STEP 2 â€“ ESTABLISHMENT DETAILS
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
   STEP 3 â€“ ACCOUNT CREDENTIALS + OTP
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
   Helper â€“ Convert Base64 â†’ Blob
   ============================================================ */
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}