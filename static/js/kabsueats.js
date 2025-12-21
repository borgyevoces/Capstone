// ==========================================
// KABSUEATS MAP CONFIGURATION
// ==========================================

let map = null;
let userMarker = null;
let establishmentMarkers = [];
let routingControl = null;
let userLocation = null;

// Default center coordinates (Cavite State University - Bacoor Campus)
const DEFAULT_CENTER = {
    lat: 14.4513,
    lng: 120.9548
};

// Default zoom levels
const DEFAULT_ZOOM = 15;
const USER_LOCATION_ZOOM = 16;
const ESTABLISHMENT_ZOOM = 17;

// ==========================================
// MAP INITIALIZATION
// ==========================================

function initializeMap() {
    // Check if map is already initialized
    if (map !== null) {
        return;
    }

    // Create map with default view
    map = L.map('map', {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Set initial view on page load
    setDefaultMapView();

    console.log('✅ Map initialized successfully');
}

// ==========================================
// SET DEFAULT MAP VIEW
// ==========================================

function setDefaultMapView() {
    if (!map) {
        console.error('❌ Map not initialized');
        return;
    }

    // Set view to default center with smooth animation
    map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM, {
        animate: true,
        duration: 1
    });

    console.log('✅ Map view set to default location');
}

// ==========================================
// SHOW MY LOCATION FUNCTIONALITY
// ==========================================

function showMyLocation() {
    if (!map) {
        console.error('❌ Map not initialized');
        alert('Map is not ready yet. Please try again.');
        return;
    }

    const button = document.getElementById('showLocationBtn');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        resetLocationButton();
        return;
    }

    // Get current position
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Store user location
            userLocation = { lat, lng };

            // Remove existing user marker if any
            if (userMarker) {
                map.removeLayer(userMarker);
            }

            // Create custom icon for user location
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: `
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: #4285F4;
                        border: 4px solid white;
                        border-radius: 50%;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                    ">
                        <i class="fas fa-user" style="color: white; font-size: 16px;"></i>
                        <div style="
                            position: absolute;
                            width: 60px;
                            height: 60px;
                            background: rgba(66, 133, 244, 0.2);
                            border-radius: 50%;
                            animation: pulse 2s infinite;
                        "></div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            // Add user marker to map
            userMarker = L.marker([lat, lng], { icon: userIcon })
                .addTo(map)
                .bindPopup(`
                    <div style="text-align: center; padding: 5px;">
                        <strong style="color: #4285F4;">📍 Your Location</strong><br>
                        <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
                    </div>
                `)
                .openPopup();

            // Center map on user location with smooth animation
            map.setView([lat, lng], USER_LOCATION_ZOOM, {
                animate: true,
                duration: 1.5
            });

            // Show establishments near user
            showNearbyEstablishments(lat, lng);

            console.log('✅ User location found:', lat, lng);
            resetLocationButton();
        },
        function(error) {
            let errorMessage = 'Unable to get your location. ';

            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'The request to get your location timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
            }

            alert(errorMessage);
            console.error('❌ Geolocation error:', error);
            resetLocationButton();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function resetLocationButton() {
    const button = document.getElementById('showLocationBtn');
    if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-location-arrow"></i> Show My Location';
    }
}

// Add pulse animation for user marker
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.2);
            opacity: 0.5;
        }
        100% {
            transform: scale(1.4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==========================================
// ESTABLISHMENT MARKERS
// ==========================================

function showNearbyEstablishments(userLat, userLng) {
    // Clear existing establishment markers
    clearEstablishmentMarkers();

    // Get all establishment items from the page
    const establishmentItems = document.querySelectorAll('.food-establishment-item');

    if (establishmentItems.length === 0) {
        console.log('ℹ️ No establishments found on page');
        return;
    }

    establishmentItems.forEach(item => {
        const lat = parseFloat(item.dataset.latitude);
        const lng = parseFloat(item.dataset.longitude);
        const name = item.dataset.name || 'Unnamed Establishment';
        const address = item.dataset.address || 'No address available';
        const status = item.dataset.status || 'Unknown';
        const establishmentId = item.dataset.id;

        // Skip if no coordinates
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            return;
        }

        // Calculate distance from user
        const distance = calculateDistance(userLat, userLng, lat, lng);

        // Create custom icon based on status
        const markerColor = status === 'Open' ? '#28a745' : '#dc3545';
        const establishmentIcon = L.divIcon({
            className: 'establishment-marker',
            html: `
                <div style="
                    width: 32px;
                    height: 32px;
                    background: ${markerColor};
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fas fa-store" style="color: white; font-size: 14px;"></i>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        // Add marker to map
        const marker = L.marker([lat, lng], { icon: establishmentIcon })
            .addTo(map)
            .bindPopup(`
                <div style="min-width: 200px; padding: 10px;">
                    <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold;">
                        ${name}
                    </h3>
                    <p style="margin: 5px 0; color: #666; font-size: 13px;">
                        <i class="fas fa-map-marker-alt"></i> ${address}
                    </p>
                    <p style="margin: 5px 0; font-size: 13px;">
                        <span style="
                            display: inline-block;
                            padding: 3px 8px;
                            background: ${status === 'Open' ? '#28a745' : '#dc3545'};
                            color: white;
                            border-radius: 3px;
                            font-weight: bold;
                        ">
                            ${status}
                        </span>
                    </p>
                    <p style="margin: 5px 0; color: #666; font-size: 13px;">
                        <i class="fas fa-route"></i> ${distance.toFixed(2)} km away
                    </p>
                    <button
                        onclick="viewEstablishmentDetails('${establishmentId}')"
                        style="
                            width: 100%;
                            margin-top: 10px;
                            padding: 8px;
                            background: #B71C1C;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-weight: bold;
                        "
                        onmouseover="this.style.background='#8c1616'"
                        onmouseout="this.style.background='#B71C1C'"
                    >
                        View Details
                    </button>
                    <button
                        onclick="getDirections(${lat}, ${lng}, '${name}')"
                        style="
                            width: 100%;
                            margin-top: 5px;
                            padding: 8px;
                            background: #4285F4;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-weight: bold;
                        "
                        onmouseover="this.style.background='#357ae8'"
                        onmouseout="this.style.background='#4285F4'"
                    >
                        <i class="fas fa-directions"></i> Get Directions
                    </button>
                </div>
            `);

        establishmentMarkers.push(marker);
    });

    console.log(`✅ Showing ${establishmentMarkers.length} establishments on map`);
}

function clearEstablishmentMarkers() {
    establishmentMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    establishmentMarkers = [];
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.querySelector('.search_button');

    if (!searchInput) {
        console.log('ℹ️ Search input not found');
        return;
    }

    // Search on input change (real-time search)
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        searchEstablishments(searchTerm);
    });

    // Search on button click if exists
    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            const searchTerm = searchInput.value.toLowerCase().trim();
            searchEstablishments(searchTerm);
        });
    }

    // Search on Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = this.value.toLowerCase().trim();
            searchEstablishments(searchTerm);
        }
    });
}

function searchEstablishments(searchTerm) {
    if (!searchTerm) {
        // If search is empty, show all establishments
        const allItems = document.querySelectorAll('.food-establishment-item');
        allItems.forEach(item => {
            item.style.display = '';
        });
        return;
    }

    // Clear existing markers
    clearEstablishmentMarkers();

    let foundEstablishments = [];
    const allItems = document.querySelectorAll('.food-establishment-item');

    allItems.forEach(item => {
        const name = (item.dataset.name || '').toLowerCase();
        const address = (item.dataset.address || '').toLowerCase();

        // Check if search term matches name or address
        if (name.includes(searchTerm) || address.includes(searchTerm)) {
            item.style.display = '';

            const lat = parseFloat(item.dataset.latitude);
            const lng = parseFloat(item.dataset.longitude);

            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                foundEstablishments.push({
                    lat,
                    lng,
                    name: item.dataset.name,
                    address: item.dataset.address,
                    status: item.dataset.status,
                    id: item.dataset.id
                });
            }
        } else {
            item.style.display = 'none';
        }
    });

    if (foundEstablishments.length > 0) {
        // Show found establishments on map
        showSearchResults(foundEstablishments);

        // If only one result, zoom to it
        if (foundEstablishments.length === 1) {
            const est = foundEstablishments[0];
            map.setView([est.lat, est.lng], ESTABLISHMENT_ZOOM, {
                animate: true,
                duration: 1
            });
        } else {
            // Fit map to show all results
            const bounds = L.latLngBounds(foundEstablishments.map(e => [e.lat, e.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        console.log(`✅ Found ${foundEstablishments.length} establishments matching "${searchTerm}"`);
    } else {
        console.log(`ℹ️ No establishments found matching "${searchTerm}"`);

        // Show message if exists
        const noResultsMessage = document.getElementById('noResultsMessage');
        if (noResultsMessage) {
            noResultsMessage.style.display = 'block';
        }
    }
}

function showSearchResults(establishments) {
    clearEstablishmentMarkers();

    establishments.forEach(est => {
        const markerColor = est.status === 'Open' ? '#28a745' : '#dc3545';
        const icon = L.divIcon({
            className: 'establishment-marker',
            html: `
                <div style="
                    width: 32px;
                    height: 32px;
                    background: ${markerColor};
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fas fa-store" style="color: white; font-size: 14px;"></i>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        const marker = L.marker([est.lat, est.lng], { icon })
            .addTo(map)
            .bindPopup(`
                <div style="min-width: 200px; padding: 10px;">
                    <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold;">
                        ${est.name}
                    </h3>
                    <p style="margin: 5px 0; color: #666; font-size: 13px;">
                        <i class="fas fa-map-marker-alt"></i> ${est.address}
                    </p>
                    <p style="margin: 5px 0; font-size: 13px;">
                        <span style="
                            display: inline-block;
                            padding: 3px 8px;
                            background: ${est.status === 'Open' ? '#28a745' : '#dc3545'};
                            color: white;
                            border-radius: 3px;
                            font-weight: bold;
                        ">
                            ${est.status}
                        </span>
                    </p>
                    <button
                        onclick="viewEstablishmentDetails('${est.id}')"
                        style="
                            width: 100%;
                            margin-top: 10px;
                            padding: 8px;
                            background: #B71C1C;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-weight: bold;
                        "
                    >
                        View Details
                    </button>
                </div>
            `);

        establishmentMarkers.push(marker);
    });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// ==========================================
// DIRECTIONS FUNCTIONALITY
// ==========================================

function getDirections(destLat, destLng, destName) {
    if (!userLocation) {
        alert('Please click "Show My Location" first to get directions.');
        return;
    }

    // Remove existing routing control
    if (routingControl) {
        map.removeControl(routingControl);
    }

    // Create new routing control
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userLocation.lat, userLocation.lng),
            L.latLng(destLat, destLng)
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        addWaypoints: false,
        lineOptions: {
            styles: [{ color: '#4285F4', weight: 5, opacity: 0.7 }]
        },
        createMarker: function() { return null; }, // Hide default markers
    }).addTo(map);

    console.log(`✅ Getting directions to ${destName}`);
}

// ==========================================
// VIEW ESTABLISHMENT DETAILS
// ==========================================

function viewEstablishmentDetails(establishmentId) {
    // Construct URL to establishment details page
    const detailsUrl = `/kabsueats/establishment/${establishmentId}/`;
    window.location.href = detailsUrl;
}

// ==========================================
// INITIALIZATION ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🗺️ Initializing KabsuEats Map...');

    // Initialize map
    initializeMap();

    // Setup search functionality
    setupSearchFunctionality();

    // Setup "Show My Location" button
    const showLocationBtn = document.getElementById('showLocationBtn');
    if (showLocationBtn) {
        showLocationBtn.addEventListener('click', showMyLocation);
        console.log('✅ Show My Location button configured');
    } else {
        console.log('ℹ️ Show My Location button not found');
    }

    // Load all establishments on initial load if user location is not needed
    // This will show all establishments when page loads
    const establishmentItems = document.querySelectorAll('.food-establishment-item');
    if (establishmentItems.length > 0 && !userLocation) {
        console.log(`ℹ️ Found ${establishmentItems.length} establishments. Click "Show My Location" to see them on the map.`);
    }

    console.log('✅ KabsuEats Map initialized successfully');
});

// ==========================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ==========================================

window.showMyLocation = showMyLocation;
window.viewEstablishmentDetails = viewEstablishmentDetails;
window.getDirections = getDirections;
window.searchEstablishments = searchEstablishments;