// ============================================
// KabsuEats.js — All functions connected to Django backend
// ============================================

// ── CAROUSEL STATE ──
let cidx = 0, isGrid = false;
const VISIBLE = 5;
let bsData = []; // real backend data



// ── MAP STATE ──
let curView = 'bs', mapReady = false;
let mapInst = null, curTile = null, mkLayer = null;
let esMapData = []; // real establishment data for map

// ── MODAL STATE ──
let currentModalItem = null;

// ── CSRF Helper ──
function getCsrf() {
    return document.getElementById('csrfToken')?.value || '';
}

// ── Status Real-time Refresh Timer ──
let statusRefreshTimer = null;

// ============================================
// INIT ON DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    initSearch();
    initProfile();
    initScrollTop();
    fetchBestsellers();
    autoHideMessages();
    initEstablishmentCards();

    // ✅ FIX: Load correct cart count on every page load (realtime from backend)
    updateCartBadge();

    // ✅ FIX: Start real-time status refresh every 60 seconds
    statusRefreshTimer = setInterval(refreshBestsellerStatuses, 60000);
});

// ============================================
// AUTO-HIDE MESSAGES
// ============================================
function autoHideMessages() {
    setTimeout(() => {
        document.querySelectorAll('.message-alert').forEach(el => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s';
            setTimeout(() => el.remove(), 500);
        });
    }, 4000);
}

// ============================================
// FETCH BESTSELLERS FROM BACKEND API
// ============================================
function fetchBestsellers() {
    fetch(URLS.bestsellers)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.bestsellers.length > 0) {
                bsData = data.bestsellers;
                renderBS(bsData);
            } else {
                // Show empty state
                document.getElementById('cTrack').innerHTML =
                    '<div style="padding:40px;color:#9ca3af;font-size:14px;text-align:center;width:100%">No bestseller items at the moment. Check back soon!</div>';
                document.getElementById('cPrev').disabled = true;
                document.getElementById('cNext').disabled = true;
            }
        })
        .catch(() => {
            document.getElementById('cTrack').innerHTML =
                '<div style="padding:40px;color:#ef4444;font-size:14px;text-align:center;width:100%"><i class="fas fa-exclamation-circle"></i> Failed to load bestsellers.</div>';
        });
}

// ============================================
// ✅ FIX: REFRESH BESTSELLER STATUSES IN REAL-TIME
// Re-fetches from API and updates open/closed badges without full re-render
// ============================================
function refreshBestsellerStatuses() {
    fetch(URLS.bestsellers)
        .then(res => res.json())
        .then(data => {
            if (!data.success || !data.bestsellers.length) return;
            // Update bsData with fresh status
            data.bestsellers.forEach(fresh => {
                const idx = bsData.findIndex(x => x.id === fresh.id);
                if (idx !== -1) {
                    bsData[idx].establishment.status = fresh.establishment.status;
                }
            });
            // Update all visible status badges in cards
            document.querySelectorAll('.bsc').forEach(card => {
                const onclickAttr = card.getAttribute('onclick') || '';
                const match = onclickAttr.match(/openMod\((\d+)\)/);
                if (!match) return;
                const itemId = parseInt(match[1]);
                const item = bsData.find(x => x.id === itemId);
                if (!item) return;
                const st = (item.establishment.status || 'closed').toLowerCase();
                const badge = card.querySelector('.sp');
                if (badge) {
                    badge.className = `sp ${st}`;
                    badge.textContent = st.toUpperCase();
                }
            });
            // If modal is open, update its status too
            if (currentModalItem) {
                const fresh = data.bestsellers.find(x => x.id === currentModalItem.id);
                if (fresh) {
                    currentModalItem.establishment.status = fresh.establishment.status;
                    const st = (fresh.establishment.status || 'closed').toLowerCase();
                    const stEl = document.getElementById('mEstS');
                    if (stEl) {
                        stEl.className = `mests ${st}`;
                        stEl.innerHTML = `<i class="fas fa-circle" style="font-size:8px"></i> ${cap(st)}`;
                    }
                }
            }
        })
        .catch(() => {}); // Silent fail for background refresh
}

// ============================================
// RENDER BESTSELLER CARDS
// ============================================
function renderBS(data) {
    const track = document.getElementById('cTrack');
    if (!data || data.length === 0) {
        track.innerHTML = '<div style="padding:40px;color:#9ca3af;font-size:14px;text-align:center;width:100%">No bestsellers available.</div>';
        return;
    }

    track.innerHTML = data.map(d => {
        const st = (d.establishment.status || 'closed').toLowerCase(); // ✅ FIX: always lowercase, default 'closed'
        const imgSrc = d.image || 'https://via.placeholder.com/280x180?text=' + encodeURIComponent(d.name);
        const estImg = EST_IMG_MAP[d.establishment.id] || '';
        const estIconHtml = estImg
            ? `<img src="${estImg}" alt="${escHtml(d.establishment.name)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-utensils\\'></i>'">`
            : `<i class="fas fa-utensils"></i>`;
        return `
        <div class="bsc" onclick="openMod(${d.id})">
            <div class="bsc-img">
                <img src="${imgSrc}" alt="${escHtml(d.name)}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/280x180?text=Food'">
                <span class="bsc-badge"><i class="fas fa-star"></i> Best Seller</span>
            </div>
            <div class="bsc-body">
                <div class="bsc-name">${escHtml(d.name)}</div>
                <div class="bsc-price">₱${parseFloat(d.price).toFixed(2)}</div>
                <div class="bsc-stats">
                    <span><i class="fas fa-shopping-bag"></i> ${d.total_orders} orders</span>
                    <span><i class="fas fa-boxes"></i> ${d.quantity} left</span>
                </div>
                <div class="bsc-est">
                    <div class="bsc-eico">${estIconHtml}</div>
                    <div class="bsc-einfo">
                        <div class="bsc-ename">${escHtml(d.establishment.name)}</div>
                        <div class="bsc-emeta">
                            <span class="sp ${st}">${st.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <button class="bsc-btn" onclick="event.stopPropagation();openMod(${d.id})">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>`;
    }).join('');

    cidx = 0;
    updCar();
    updNav();
}

// ── Carousel helpers ──
function cardW() {
    const c = document.querySelector('.bsc');
    return c ? c.offsetWidth + 20 : 238;
}
function maxIdx() {
    // In search mode, use actual rendered card count; otherwise use bsData length
    const track = document.getElementById('cTrack');
    const cardCount = track ? track.querySelectorAll('.bsc').length : bsData.length;
    return Math.max(0, cardCount - VISIBLE);
}

function cScroll(d) {
    if (isGrid) return;
    cidx = Math.max(0, Math.min(cidx + d, maxIdx()));
    updCar(); updNav();
}
function updCar() {
    if (isGrid) return;
    document.getElementById('cTrack').style.transform = `translateX(-${cidx * cardW()}px)`;
}
function updNav() {
    document.getElementById('cPrev').disabled = cidx <= 0;
    document.getElementById('cNext').disabled = cidx >= maxIdx();
}

// ── GRID TOGGLE ──
function toggleGrid() {
    isGrid = !isGrid;
    const t = document.getElementById('cTrack');
    const w = document.getElementById('carouselWrap');
    const b = document.getElementById('gvBtn');
    const ico = document.getElementById('gvIco');
    const lbl = document.getElementById('gvLbl');
    if (isGrid) {
        t.classList.add('gmode'); w.classList.add('gmode');
        b.classList.add('on'); ico.className = 'fas fa-list'; lbl.textContent = 'List View';
        t.style.transform = 'none';
    } else {
        t.classList.remove('gmode'); w.classList.remove('gmode');
        b.classList.remove('on'); ico.className = 'fas fa-th'; lbl.textContent = 'Grid View';
        cidx = 0; updCar(); updNav();
    }
}

// ============================================
// VIEW SWITCHER: BESTSELLERS ↔ MAP
// ============================================
function toggleDD() {
    document.getElementById('ddPanel').classList.toggle('show');
    document.getElementById('ddBtn').classList.toggle('open');
}
function closeDD() {
    document.getElementById('ddPanel').classList.remove('show');
    document.getElementById('ddBtn').classList.remove('open');
}

function setView(v) {
    closeDD();
    const cw = document.getElementById('carouselWrap');
    const ms = document.getElementById('mapSection');
    const gv = document.getElementById('gvBtn');
    const db = document.getElementById('ddBtn');
    const dl = document.getElementById('ddLabel');
    const dbs = document.getElementById('ddBS');
    const dmap = document.getElementById('ddMap');

    if (v === 'bs') {
        cw.style.display = '';
        ms.classList.remove('on');
        gv.style.display = 'flex';
        dbs.classList.add('sel'); dmap.classList.remove('sel');
        dl.textContent = 'Best Sellers';
        db.classList.remove('mapmode');
        db.querySelector('i').className = 'fas fa-trophy';
        // Stop real-time polling when map is hidden
        if (mapPollTimer) { clearInterval(mapPollTimer); mapPollTimer = null; }
    } else {
        cw.style.display = 'none';
        ms.classList.add('on');
        gv.style.display = 'none';
        dbs.classList.remove('sel'); dmap.classList.add('sel');
        dl.textContent = 'View Map';
        db.classList.add('mapmode');
        db.querySelector('i').className = 'fas fa-map';
        if (!mapReady) { initMap(); mapReady = true; }
        else {
            setTimeout(() => mapInst && mapInst.invalidateSize(), 120);
            // Restart polling when map becomes visible again
            fetchMapEstablishments();
            if (!mapPollTimer) mapPollTimer = setInterval(fetchMapEstablishments, 30000);
        }
    }
    curView = v;
}


// ============================================
// LEAFLET MAP — screenshot-matching design
// ============================================
const TILES = {
    street:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                 opt: { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 } },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                 opt: { attribution: 'Tiles &copy; Esri', maxZoom: 20 } },
    topo:      { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                 opt: { attribution: '&copy; OpenTopoMap', maxZoom: 17 } },
    dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                 opt: { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 20 } }
};

let mapPollTimer = null;
let liveStatusCache = {};
let userLocMarker = null;
let mapFilterState = { status: '', alpha: '', dist: '', rating: '', cat: '', search: '' };

function initMap() {
    setTimeout(() => {
        mapInst = L.map('esMap', { center: [CVSU.lat, CVSU.lng], zoom: 16, zoomControl: true, scrollWheelZoom: true });
        curTile = L.tileLayer(TILES.satellite.url, TILES.satellite.opt).addTo(mapInst);

        L.circle([CVSU.lat, CVSU.lng], {
            color: '#B71C1C', fillColor: 'rgba(183,28,28,0.06)',
            fillOpacity: 0.3, weight: 2, radius: RADIUS, dashArray: '6 4'
        }).addTo(mapInst);

        const cvIco = L.divIcon({
            html: '<div style="background:#B71C1C;color:#fff;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 12px rgba(183,28,28,.6);border:3px solid #fff;"><i class="fas fa-university"></i></div>',
            className: '', iconSize: [38, 38], iconAnchor: [19, 19]
        });
        L.marker([CVSU.lat, CVSU.lng], { icon: cvIco }).addTo(mapInst)
            .bindPopup('<div style="font-family:Poppins,sans-serif;font-weight:700;font-size:13px;padding:2px 4px;">📍 CvSU-Bacoor Campus<br><span style="font-weight:400;font-size:11px;color:#6b7280;">Bacoor, Cavite</span></div>');

        mkLayer = L.layerGroup().addTo(mapInst);

        // Load all establishments from API — primary source for coordinates
        loadAllEstablishments();
        mapPollTimer = setInterval(loadAllEstablishments, 30000);
        mapInst.invalidateSize();
    }, 150);
}

// ── API is the ONLY source of lat/lng (guaranteed non-null by backend filter) ──
// ── EST_ALL_DATA enriches with image + real-time status only ──
function loadAllEstablishments() {
    // Use 999km radius — backend already filters lat/lng non-null, this returns ALL registered
    fetch(`${URLS.nearbyEst}?lat=${CVSU.lat}&lng=${CVSU.lng}&radius=999999`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            // Merge API coordinates with local image/status data
            const merged = data.establishments.map(e => {
                const local = (typeof EST_ALL_DATA !== 'undefined' && EST_ALL_DATA[e.id]) || {};
                return {
                    id: e.id,
                    name: local.name || e.name || '',
                    address: local.address || e.address || '',
                    image: local.image || '',
                    // Status: prefer EST_ALL_DATA (server-rendered, real-time) over API (no status field)
                    status: local.status || liveStatusCache[e.id] || '',
                    latitude: parseFloat(e.latitude),
                    longitude: parseFloat(e.longitude),
                    distance: e.distance || 0,
                    // ✅ Include other_category and other_amenity for filtering/display
                    categories: local.categories || '',
                    other_category: local.other_category || '',
                    other_amenity: local.other_amenity || ''
                };
            });
            esMapData = merged;
            renderMarkers(applyFiltersToData(esMapData));
        })
        .catch(err => console.error('Map load error:', err));
}

// Keep these as aliases for compatibility
function renderFromLocalData() { loadAllEstablishments(); }
function refreshEstablishmentStatuses() { loadAllEstablishments(); }
function fetchMapEstablishments() { loadAllEstablishments(); }

function applyFiltersToData(data) {
    let result = [...data];
    const f = mapFilterState;
    if (f.status) result = result.filter(e => (e.status || '').toLowerCase() === f.status);
    // ✅ Filter by category — checks both standard categories AND other_category
    if (f.cat) {
        const q = f.cat.toLowerCase();
        result = result.filter(e => {
            const cats = (e.categories || '').toLowerCase();
            const other = (e.other_category || '').toLowerCase();
            return cats.includes(q) || other.includes(q);
        });
    }
    if (f.alpha === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
    if (f.alpha === 'za') result.sort((a, b) => b.name.localeCompare(a.name));
    if (f.dist === 'near') result.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    if (f.dist === 'far')  result.sort((a, b) => (b.distance || 0) - (a.distance || 0));
    if (f.rating === 'high') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (f.rating === 'low')  result.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    if (f.search) {
        const q = f.search.toLowerCase();
        result = result.filter(e => e.name.toLowerCase().includes(q) || (e.address || '').toLowerCase().includes(q));
    }
    return result;
}

function applyMapFilter() {
    mapFilterState.status = document.getElementById('mfStatus').value;
    mapFilterState.alpha  = document.getElementById('mfAlpha').value;
    mapFilterState.dist   = document.getElementById('mfDist').value;
    mapFilterState.rating = document.getElementById('mfRating').value;
    mapFilterState.cat    = document.getElementById('mfCat').value;
    renderMarkers(applyFiltersToData(esMapData));
}

function filterMapMarkers(q) {
    mapFilterState.search = q.trim();
    renderMarkers(applyFiltersToData(esMapData));
}

function renderMarkers(data) {
    if (!mkLayer) return;
    mkLayer.clearLayers();
    data.forEach(e => {
        if (!e.latitude || !e.longitude) return;
        const st = (e.status || '').toLowerCase();
        const isOpen = st === 'open';
        const borderColor = isOpen ? '#f7931e' : '#ef4444';
        const bgColor = isOpen ? '#fff' : '#374151';
        const faceColor = isOpen ? '#374151' : '#fff';
        const glow = isOpen
            ? '0 0 0 3px rgba(247,147,30,0.4), 0 3px 14px rgba(0,0,0,.4)'
            : '0 3px 14px rgba(0,0,0,.35)';
        const pulse = isOpen
            ? '<div style="position:absolute;top:0;left:0;width:44px;height:44px;border-radius:50%;background:rgba(247,147,30,0.3);animation:pulse 2s infinite;z-index:0;"></div>'
            : '';
        const face = e.image
            ? `<img src="${e.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-store\\'style=\\'color:${faceColor};font-size:18px;\\'></i>'">`
            : `<i class="fas fa-store" style="color:${faceColor};font-size:18px;"></i>`;
        const ico = L.divIcon({
            html: '<div style="position:relative;width:44px;height:44px;">' + pulse +
                  '<div style="width:44px;height:44px;border-radius:50%;background:' + bgColor + ';' +
                  'display:flex;align-items:center;justify-content:center;' +
                  'border:3px solid ' + borderColor + ';overflow:hidden;' +
                  'box-shadow:' + glow + ';position:relative;z-index:1;">' + face + '</div></div>',
            className: '', iconSize: [44, 44], iconAnchor: [22, 22]
        });
        const statusBg = isOpen ? '#d1fae5' : '#fee2e2';
        const statusFg = isOpen ? '#065f46' : '#991b1b';
        const statusDot = '<span style="width:6px;height:6px;border-radius:50%;background:' + (isOpen ? '#10b981' : '#ef4444') + ';display:inline-block;margin-right:4px;"></span>';
        const statusLabel = st ? cap(st) : 'Unknown';
        const distRow = (e.distance && e.distance > 0)
            ? '<div style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:4px;margin-top:5px;"><i class="fas fa-route" style="color:#B71C1C;font-size:10px;"></i>' +
              (e.distance < 1000 ? Math.round(e.distance) + 'm' : (e.distance/1000).toFixed(2) + 'km') + ' away</div>' : '';
        const imgBanner = e.image
            ? '<img src="' + e.image + '" style="width:calc(100% + 24px);margin:-12px -12px 10px;height:80px;object-fit:cover;border-radius:8px 8px 0 0;display:block;" onerror="this.remove()">'
            : '';
        const popup =
            '<div style="font-family:Poppins,sans-serif;min-width:200px;">' +
            imgBanner +
            '<div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:2px;">' + escHtml(e.name) + '</div>' +
            '<div style="font-size:11px;color:#6b7280;margin-bottom:7px;">' + escHtml(e.address || '') + '</div>' +
            '<div style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:5px;background:' + statusBg + ';color:' + statusFg + ';font-size:11px;font-weight:700;">' +
            statusDot + statusLabel + '</div>' + distRow +
            '<button onclick="window.location.href=\'' + URLS.estDetail + e.id + '/\'" ' +
            'style="margin-top:10px;width:100%;padding:9px;background:linear-gradient(135deg,#B71C1C,#8B0000);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;">' +
            '<i class="fas fa-eye"></i> View Details</button></div>';

        L.marker([parseFloat(e.latitude), parseFloat(e.longitude)], { icon: ico })
            .addTo(mkLayer)
            .bindPopup(popup, { maxWidth: 240, className: 'kabsueats-popup' });
    });
}

function toggleLayerPanel() {
    document.getElementById('mapLayerPanel').classList.toggle('show');
}

function switchTile(t) {
    if (!mapInst) return;
    document.querySelectorAll('.mlp-opt').forEach(b => b.classList.remove('on'));
    const btn = document.getElementById('mts-' + t);
    if (btn) btn.classList.add('on');
    if (curTile) mapInst.removeLayer(curTile);
    curTile = L.tileLayer(TILES[t].url, TILES[t].opt).addTo(mapInst);
    document.getElementById('mapLayerPanel').classList.remove('show');
}

function showMyLocation() {
    const btn = document.getElementById('mapLocBtn');
    if (!btn || !navigator.geolocation) {
        showToast('Geolocation not supported.', 'error'); return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            if (userLocMarker) mapInst.removeLayer(userLocMarker);
            const locIco = L.divIcon({
                html: '<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.3),0 2px 8px rgba(0,0,0,.3);"></div>',
                className: '', iconSize: [18, 18], iconAnchor: [9, 9]
            });
            userLocMarker = L.marker([lat, lng], { icon: locIco }).addTo(mapInst)
                .bindPopup('<div style="font-family:Poppins,sans-serif;font-weight:600;font-size:13px;">You are here</div>')
                .openPopup();
            mapInst.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-location-arrow"></i> Show My Location';
        },
        () => {
            showToast('Could not get location. Allow location access.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-location-arrow"></i> Show My Location';
        },
        { timeout: 8000, maximumAge: 30000 }
    );
}

// ============================================
// CATEGORY FILTER — filters DOM elements
// ============================================
function applyFilter() {
    const val = document.getElementById('catFilt').value.toLowerCase();
    document.querySelectorAll('.food-est-item').forEach(el => {
        const cat = (el.dataset.category || '').toLowerCase();
        el.style.display = (!val || cat.includes(val)) ? '' : 'none';
    });
}

// ============================================
// BESTSELLER MODAL — opens with backend data
// ✅ FIX: Uses fresh real-time status from API
// ============================================
function openMod(id) {
    const d = bsData.find(x => x.id === id);
    if (!d) return;
    currentModalItem = d;
    const imgSrc = d.image || 'https://via.placeholder.com/400x380?text=' + encodeURIComponent(d.name);
    document.getElementById('mImg').src = imgSrc;
    document.getElementById('mName').textContent = d.name;
    document.getElementById('mDesc').textContent = d.description || '';
    document.getElementById('mPrice').textContent = `₱${parseFloat(d.price).toFixed(2)}`;
    document.getElementById('mStock').innerHTML = `<i class="fas fa-box"></i> ${d.quantity} Items`;
    document.getElementById('mEstN').textContent = d.establishment.name;
    document.getElementById('mEstA').textContent = d.establishment.address || '';

    // ✅ FIX: Always compute status fresh from the stored bsData (which refreshBestsellerStatuses keeps current)
    const st = (d.establishment.status || 'closed').toLowerCase();
    const stEl = document.getElementById('mEstS');
    stEl.className = `mests ${st}`;
    stEl.innerHTML = `<i class="fas fa-circle" style="font-size:8px"></i> ${cap(st)}`;

    document.getElementById('mqty').value = 1;
    document.getElementById('bsMod').classList.add('on');
    document.body.style.overflow = 'hidden';

    // ✅ FIX: Fetch fresh status at modal open time
    fetch(URLS.bestsellers)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            const fresh = data.bestsellers.find(x => x.id === id);
            if (!fresh) return;
            // Update stored data
            const idx = bsData.findIndex(x => x.id === id);
            if (idx !== -1) bsData[idx].establishment.status = fresh.establishment.status;
            currentModalItem = bsData[idx] || currentModalItem;
            // Update modal status badge
            const freshSt = (fresh.establishment.status || 'closed').toLowerCase();
            const el = document.getElementById('mEstS');
            if (el) {
                el.className = `mests ${freshSt}`;
                el.innerHTML = `<i class="fas fa-circle" style="font-size:8px"></i> ${cap(freshSt)}`;
            }
        })
        .catch(() => {}); // Silent — already showing a status
}

function closeMod() {
    document.getElementById('bsMod').classList.remove('on');
    document.body.style.overflow = '';
    currentModalItem = null;
}

function chgQ(d) {
    const e = document.getElementById('mqty');
    const max = currentModalItem ? currentModalItem.quantity : 99;
    e.value = Math.max(1, Math.min(parseInt(e.value) + d, max));
}

// ============================================
// ADD TO CART — POST to /cart/add/
// ✅ FIX: Properly connected, closes modal on success
// ============================================
function addToCartFromModal() {
    if (!IS_AUTHENTICATED) { window.location.href = URLS.login; return; }
    if (!currentModalItem) return;
    const qty = parseInt(document.getElementById('mqty').value) || 1;

    const btn = document.getElementById('addToCartBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    }

    fetch(URLS.addToCart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify({ menu_item_id: currentModalItem.id, quantity: qty })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            closeMod();
            // backend returns cart_count directly in add_to_cart response
            const badge = document.getElementById('cartBadge');
            if (badge && data.cart_count !== undefined) badge.textContent = data.cart_count;
            else updateCartBadge();
            showToast(data.message || 'Item added to cart!', 'success');
        } else {
            showToast(data.message || 'Could not add to cart.', 'error');
        }
    })
    .catch(() => showToast('Network error. Please try again.', 'error'))
    .finally(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
        }
    });
}

// ============================================
// BUY NOW — Adds item to cart then redirects to cart page
// ✅ UPDATED: Adds to cart and redirects to /cart/?pay=1
//             so user picks Cash or Online Payment in cart
// ============================================
function buyNowFromModal() {
    if (!IS_AUTHENTICATED) { window.location.href = URLS.login; return; }
    if (!currentModalItem) return;
    const qty = parseInt(document.getElementById('mqty').value) || 1;

    const btn = document.getElementById('buyNowBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    // Add item to cart first, then redirect to cart page with pay=1
    fetch(URLS.addToCart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify({ menu_item_id: currentModalItem.id, quantity: qty })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Redirect to cart page with ?pay=1 to auto-show payment options
            window.location.href = URLS.cart + '?pay=1';
        } else {
            showToast(data.message || data.error || 'Could not process Buy Now.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now';
            }
        }
    })
    .catch(() => {
        showToast('Network error. Please try again.', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now';
        }
    });
}

// ============================================
// UPDATE CART BADGE
// ============================================
function updateCartBadge() {
    if (!IS_AUTHENTICATED) return;
    fetch(URLS.cartCount)
        .then(r => r.json())
        .then(data => {
            const badge = document.getElementById('cartBadge');
            // backend returns { success: true, cart_count: N }
            if (badge) badge.textContent = data.cart_count ?? data.count ?? 0;
        })
        .catch(() => {});
}

// ============================================
// PROFILE DROPDOWN
// ============================================
function initProfile() {
    const pavBtn = document.getElementById('pavBtn');
    if (!pavBtn) return;
    pavBtn.addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('pdrop').classList.toggle('show');
    });
    const editBtn = document.getElementById('editProf');
    if (editBtn) {
        editBtn.addEventListener('click', e => { e.preventDefault(); openSet(); });
    }
}

function openSet() {
    document.getElementById('setMod').classList.add('on');
    document.getElementById('pdrop').classList.remove('show');
    document.body.style.overflow = 'hidden';
}
function closeSet() {
    document.getElementById('setMod').classList.remove('on');
    document.body.style.overflow = '';
}

// ============================================
// PROFILE IMAGE — preview + real-time AJAX save
// ============================================
function previewProfileImg(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById('profilePreview');
            preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveProfile() {
    const input = document.getElementById('profileImgInput');
    const btn   = document.getElementById('saveProfileBtn');

    if (!input || !input.files || !input.files[0]) {
        showToast('Please choose a profile picture first.', 'warning');
        return;
    }

    // Loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

    const fd = new FormData();
    fd.append('profile_picture', input.files[0]);
    fd.append('csrfmiddlewaretoken', getCsrf());

    fetch(URLS.updateProfile, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf() },
        body: fd
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const newUrl = data.profile_picture_url;

            // ① Update preview inside modal
            document.getElementById('profilePreview').innerHTML =
                `<img src="${newUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

            // ② Update navbar avatar instantly
            const nav = document.getElementById('pavBtn');
            if (nav) nav.innerHTML =
                `<img src="${newUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

            // ③ Update dropdown header avatar instantly
            const da = document.querySelector('.pd-av');
            if (da) da.innerHTML =
                `<img src="${newUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

            showToast('Profile picture updated!', 'success');
            closeSet();
        } else {
            showToast(data.errors || 'Could not update profile.', 'error');
        }
    })
    .catch(() => showToast('Network error. Please try again.', 'error'))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    });
}

// ============================================
// ============================================
// SEARCH — Smart Autocomplete + Live Page Transitions
// Connects: dropdown → Bestsellers carousel → Establishment grid
// ============================================

// ── State ──
let searchMode     = 'none'; // 'none' | 'menu' | 'establishment' | 'empty'
let lastSearchQuery = '';

const RECENT_KEY  = 'ke_recent_searches';
const MAX_RECENT  = 6;
const DEBOUNCE_MS = 240;

let searchTimer   = null;
let searchAbort   = null;
let searchFocused = false;
let dropSelected  = -1;
let _trendCache   = null;

// ── Recent Searches (localStorage) ──────────────────────────────────────────
function getRecents() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch(e) { return []; }
}
function saveRecent(q) {
    if (!q || q.length < 2) return;
    let list = getRecents().filter(r => r.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT))); } catch(e) {}
}
function removeRecent(q) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(getRecents().filter(r => r !== q))); } catch(e) {}
}
function clearAllRecents() {
    try { localStorage.removeItem(RECENT_KEY); } catch(e) {}
}

// ── Trending cache ────────────────────────────────────────────────────────────
function fetchTrending(cb) {
    if (_trendCache) { cb(_trendCache); return; }
    const url = (typeof URLS !== 'undefined' && URLS.searchTrending)
        ? URLS.searchTrending : '/api/search-trending/';
    fetch(url).then(r => r.ok ? r.json() : null)
        .then(d => { if (d && d.establishments) { _trendCache = d.establishments; cb(_trendCache); } })
        .catch(() => {});
}

// ── Text highlighter util ─────────────────────────────────────────────────────
function hlText(html, q) {
    if (!q) return html;
    return html.replace(new RegExp(`(${escapeRe(q)})`, 'gi'),
        '<mark class="search-match">$1</mark>');
}

// ============================================
// MAIN INIT
// ============================================
function initSearch() {
    const inp  = document.getElementById('hSearch');
    const clr  = document.getElementById('hClr');
    const drop = document.getElementById('searchDropdown');
    if (!inp) return;

    inp.addEventListener('input', function () {
        const q = this.value.trim();
        clr.classList.toggle('on', q.length > 0);
        dropSelected = -1;
        clearTimeout(searchTimer);

        if (q.length < 1) {
            filterEstCards('');
            restoreNormalView();
            showIdleDrop();
            return;
        }

        showDropSkeleton();
        filterEstCards(q);                                      // instant DOM filter
        searchTimer = setTimeout(() => fetchSearchResults(q), DEBOUNCE_MS);
    });

    inp.addEventListener('focus', function () {
        searchFocused = true;
        const q = this.value.trim();
        if (q.length >= 1) fetchSearchResults(q);
        else showIdleDrop();
    });

    inp.addEventListener('blur', () => { searchFocused = false; setTimeout(closeDrop, 180); });

    clr.addEventListener('click', function () {
        inp.value = '';
        this.classList.remove('on');
        closeDrop();
        filterEstCards('');
        restoreNormalView();
        inp.focus();
    });

    inp.addEventListener('keydown', function (e) {
        if (!drop) return;
        const items = drop.querySelectorAll('.search-dropdown-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            dropSelected = Math.min(dropSelected + 1, items.length - 1);
            highlightDropItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            dropSelected = Math.max(dropSelected - 1, -1);
            highlightDropItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (dropSelected >= 0 && items[dropSelected]) items[dropSelected].click();
        } else if (e.key === 'Escape') {
            closeDrop(); inp.blur();
        }
    });

    // Top-rated hint pills
    document.querySelectorAll('.hs-hint-pill').forEach(pill => {
        pill.addEventListener('click', function (e) {
            if (this.tagName === 'A') return;
            e.preventDefault();
            const text = this.textContent.trim().replace(/^[^\w]+/, '');
            inp.value = text;
            clr.classList.add('on');
            filterEstCards(text);
            fetchSearchResults(text);
            inp.focus();
        });
    });

    fetchTrending(() => {}); // pre-warm
}

function highlightDropItem(items) {
    items.forEach((el, i) => {
        el.style.background = i === dropSelected ? 'var(--g50)' : '';
    });
    if (dropSelected >= 0) items[dropSelected].scrollIntoView({ block: 'nearest' });
}

function closeDrop() {
    const drop = document.getElementById('searchDropdown');
    if (drop) drop.classList.remove('active');
    dropSelected = -1;
}

// ============================================
// INSTANT DOM FILTER — establishment grid
// Shows/hides cards + highlights matched name text
// ============================================
function filterEstCards(q) {
    const ql = q.toLowerCase();
    document.querySelectorAll('.food-est-item').forEach(el => {
        // Restore original name text before re-highlighting
        const nameEl = el.querySelector('.estc-name');
        if (nameEl && nameEl.dataset.origText) {
            nameEl.textContent = nameEl.dataset.origText;
        }

        if (!ql) {
            el.style.display = '';
            return;
        }

        const name = (el.dataset.name     || '').toLowerCase();
        const cat  = (el.dataset.category || '').toLowerCase();
        const hits = name.includes(ql) || cat.includes(ql);

        el.style.display = hits ? '' : 'none';

        // Highlight matched name in card
        if (hits && nameEl) {
            if (!nameEl.dataset.origText) nameEl.dataset.origText = nameEl.textContent;
            nameEl.innerHTML = hlText(escHtml(nameEl.dataset.origText), q);
        }
    });
}

// ============================================
// IDLE DROPDOWN (focus + empty input)
// Shows: Recent Searches + Trending Hubs
// ============================================
function showIdleDrop() {
    const drop    = document.getElementById('searchDropdown');
    const content = document.getElementById('searchDropdownContent');
    if (!drop || !content) return;

    const recents = getRecents();
    let html = '';

    if (recents.length > 0) {
        html += `<div class="search-dropdown-section">
            <div class="search-dropdown-title" style="display:flex;align-items:center;justify-content:space-between;">
                <span style="display:flex;align-items:center;gap:6px;"><i class="fas fa-history"></i> Recent Searches</span>
                <span onclick="clearAllRecents();showIdleDrop();"
                    style="font-size:10px;color:var(--red);cursor:pointer;font-weight:600;padding:2px 8px;border-radius:4px;transition:background .15s;"
                    onmouseover="this.style.background='var(--red-light)'" onmouseout="this.style.background=''">Clear all</span>
            </div>
            <div style="padding:4px 12px 10px;display:flex;flex-wrap:wrap;gap:6px;">
                ${recents.map(r => `
                <span onclick="searchPillClick(${JSON.stringify(r)})"
                    style="display:inline-flex;align-items:center;gap:6px;background:var(--g100);border:1px solid var(--g200);border-radius:20px;padding:5px 11px;font-size:12px;font-weight:500;color:var(--g700);cursor:pointer;transition:all .15s;"
                    onmouseover="this.style.background='var(--red-light)';this.style.color='var(--red)'"
                    onmouseout="this.style.background='var(--g100)';this.style.color='var(--g700)'">
                    <i class="fas fa-search" style="font-size:9px;opacity:.5;"></i>
                    ${escHtml(r)}
                    <span onclick="event.stopPropagation();removeAndRefresh(${JSON.stringify(r)})"
                        style="font-size:10px;color:var(--g400);padding:1px 3px;border-radius:50%;transition:color .15s;"
                        onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--g400)'">
                        <i class="fas fa-times"></i></span>
                </span>`).join('')}
            </div>
        </div>`;
    }

    html += `<div class="search-dropdown-section" id="sdropTrending">
        <div class="search-dropdown-title"><i class="fas fa-fire" style="color:#ef4444;"></i> Trending Food Hubs</div>
        <div id="sdropTrendRow" style="padding:4px 12px 12px;display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;">
            ${[1,2,3,4,5].map(() =>
                `<div style="flex-shrink:0;width:72px;display:flex;flex-direction:column;align-items:center;gap:6px;">
                    <div class="sk" style="width:48px;height:48px;border-radius:14px;"></div>
                    <div class="sk" style="width:48px;height:9px;border-radius:4px;"></div>
                </div>`).join('')}
        </div>
    </div>`;

    content.innerHTML = html;
    drop.classList.add('active');

    fetchTrending(ests => {
        const row = document.getElementById('sdropTrendRow');
        if (!row) return;
        if (!ests || !ests.length) { const s = document.getElementById('sdropTrending'); if (s) s.remove(); return; }
        row.innerHTML = ests.slice(0, 8).map(est => {
            const isO  = (est.status||'').toLowerCase() === 'open';
            const sBg  = isO ? '#d1fae5' : '#fee2e2';
            const sFg  = isO ? '#065f46' : '#991b1b';
            const img  = (typeof EST_IMG_MAP !== 'undefined' && EST_IMG_MAP[est.id])
                ? `<img src="${escHtml(EST_IMG_MAP[est.id])}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"
                    onerror="this.parentElement.innerHTML='<i class=\\'fas fa-store\\'></i>'">`
                : `<i class="fas fa-store" style="font-size:18px;"></i>`;
            const url  = `${URLS.estDetail}${est.id}/`;
            return `<div onclick="saveRecent(${JSON.stringify(est.name)});window.location.href='${url}'"
                style="flex-shrink:0;width:72px;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;">
                <div style="width:48px;height:48px;border-radius:14px;background:var(--g100);border:2px solid var(--g200);display:flex;align-items:center;justify-content:center;color:var(--g600);overflow:hidden;transition:border-color .2s,transform .2s;"
                    onmouseover="this.style.borderColor='var(--red)';this.style.transform='scale(1.08)'"
                    onmouseout="this.style.borderColor='var(--g200)';this.style.transform=''">${img}</div>
                <div style="font-size:10px;font-weight:600;color:var(--g700);text-align:center;line-height:1.3;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(est.name)}</div>
                <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;background:${sBg};color:${sFg};">${isO?'OPEN':'CLOSED'}</span>
            </div>`;
        }).join('');
    });
}

// ============================================
// SKELETON (shown while API fetches)
// ============================================
function showDropSkeleton() {
    const drop    = document.getElementById('searchDropdown');
    const content = document.getElementById('searchDropdownContent');
    if (!drop || !content) return;
    content.innerHTML = `<div style="padding:14px 16px;">
        <div class="sk" style="height:10px;width:32%;border-radius:5px;margin-bottom:14px;"></div>
        ${[1,2,3].map(() => `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:13px;">
            <div class="sk" style="width:36px;height:36px;border-radius:9px;flex-shrink:0;"></div>
            <div style="flex:1;">
                <div class="sk" style="height:12px;width:62%;border-radius:4px;margin-bottom:7px;"></div>
                <div class="sk" style="height:10px;width:40%;border-radius:4px;"></div>
            </div>
            <div class="sk" style="width:44px;height:14px;border-radius:4px;flex-shrink:0;"></div>
        </div>`).join('')}
    </div>`;
    drop.classList.add('active');
}

// ============================================
// FETCH from backend
// ============================================
function fetchSearchResults(q) {
    if (searchAbort) { try { searchAbort.abort(); } catch(e) {} }
    searchAbort = new AbortController();
    lastSearchQuery = q;

    fetch(`${URLS.searchMenu}?q=${encodeURIComponent(q)}`, { signal: searchAbort.signal })
        .then(r => r.ok ? r.json() : { menus: [], establishments: [] })
        .then(data => {
            renderSearchDrop(data, q);
            applySearchToPage(data, q);
        })
        .catch(err => { if (err.name !== 'AbortError') closeDrop(); });
}

// ============================================
// APPLY RESULTS TO PAGE — carousel + grid
// ============================================
function applySearchToPage(data, q) {
    // Sort OPEN establishments first in both arrays
    const openFirst = arr => arr.slice().sort((a, b) => {
        const aO = ((a.establishment ? a.establishment.status : a.status)||'').toLowerCase()==='open' ? 0 : 1;
        const bO = ((b.establishment ? b.establishment.status : b.status)||'').toLowerCase()==='open' ? 0 : 1;
        return aO - bO;
    });

    const menus = openFirst(data.menus || []);
    const ests  = openFirst(data.establishments || []);

    if (menus.length > 0) {
        searchMode = 'menu';
        renderMenuSearchInBS(menus, q);       // Bestsellers area → menu cards
        sortEstCardsByMenuMatch(menus, q);    // Est grid → sorted + badged
    } else if (ests.length > 0) {
        searchMode = 'establishment';
        renderEstSearchInBS(ests, q);         // Bestsellers area → est cards
        // filterEstCards already ran on input
    } else {
        searchMode = 'empty';
        showBSSearchEmpty(q);
    }
}

// ============================================
// RESTORE NORMAL VIEW — smooth fade transitions
// ============================================
function restoreNormalView() {
    if (searchMode === 'none') return;
    searchMode = 'none';
    lastSearchQuery = '';

    // ── Restore BS title ──
    const titleEl = document.getElementById('bsTitle');
    if (titleEl) {
        titleEl.style.transition = 'opacity .2s ease';
        titleEl.style.opacity = '0';
        setTimeout(() => {
            titleEl.innerHTML = '<i class="fas fa-fire"></i> Top-rated items from all our partner establishments';
            titleEl.style.opacity = '1';
        }, 180);
    }

    // ── Fade-out carousel → re-render bestsellers → fade-in ──
    const track = document.getElementById('cTrack');
    if (track) {
        track.style.transition = 'opacity .2s ease';
        track.style.opacity = '0';
        setTimeout(() => {
            if (bsData.length > 0) renderBS(bsData);
            else fetchBestsellers();
            requestAnimationFrame(() => { track.style.opacity = '1'; });
        }, 210);
    }

    // ── Remove est section sub-label ──
    setEstSubLabel('');

    // ── Restore establishment cards ──
    document.querySelectorAll('.est-match-badge').forEach(el => el.remove());
    document.querySelectorAll('.food-est-item').forEach(el => {
        el.style.display  = '';
        el.style.opacity  = '1';
        el.style.transform = '';
        el.style.transition = '';
        const nameEl = el.querySelector('.estc-name');
        if (nameEl && nameEl.dataset.origText) {
            nameEl.textContent = nameEl.dataset.origText;
        }
    });

    // Restore original card order
    const grid = document.getElementById('estGrid');
    if (grid) {
        const cards = Array.from(grid.querySelectorAll('.food-est-item'));
        cards.sort((a, b) =>
            (parseInt(a.dataset.originalOrder || 9999)) - (parseInt(b.dataset.originalOrder || 9999)));
        const frag = document.createDocumentFragment();
        cards.forEach(c => frag.appendChild(c));
        grid.appendChild(frag);
    }
}

// ============================================
// BESTSELLERS AREA — MENU RESULTS
// Animated swap: fade-out → new cards slide in
// ============================================
function renderMenuSearchInBS(items, q) {
    // ── Title transition ──
    const titleEl = document.getElementById('bsTitle');
    if (titleEl) {
        titleEl.style.transition = 'opacity .2s ease';
        titleEl.style.opacity = '0';
        setTimeout(() => {
            titleEl.innerHTML = `<i class="fas fa-search" style="color:var(--red);"></i>
                ${items.length} menu result${items.length !== 1 ? 's' : ''} for
                "<strong>${escHtml(q)}</strong>"`;
            titleEl.style.opacity = '1';
        }, 180);
    }

    const track = document.getElementById('cTrack');
    if (!track) return;

    // Exit grid mode
    if (isGrid) {
        track.classList.remove('gmode');
        const wrap = document.getElementById('carouselWrap');
        if (wrap) wrap.classList.remove('gmode');
    }

    // ── Fade-out → render → staggered slide-in ──
    track.style.transition = 'opacity .2s ease';
    track.style.opacity = '0';

    setTimeout(() => {
        track.innerHTML = items.map((item, i) => {
            const estId     = item.establishment ? item.establishment.id   : '';
            const estName   = item.establishment ? item.establishment.name : '';
            const estStatus = item.establishment
                ? (item.establishment.status || 'closed').toLowerCase() : 'closed';
            const estImg    = (typeof EST_IMG_MAP !== 'undefined' && EST_IMG_MAP[estId]) || '';
            const imgSrc    = item.image_url
                || `https://via.placeholder.com/280x180?text=${encodeURIComponent(item.name)}`;
            const estIcon   = estImg
                ? `<img src="${estImg}" alt="${escHtml(estName)}"
                    onerror="this.parentElement.innerHTML='<i class=\\'fas fa-utensils\\'></i>'">`
                : `<i class="fas fa-utensils"></i>`;

            return `<div class="bsc" onclick="window.location.href='${URLS.estDetail}${estId}/'"
                style="opacity:0;transform:translateY(14px);transition:opacity .28s ease ${i * 45}ms,transform .28s ease ${i * 45}ms;">
                <div class="bsc-img">
                    <img src="${imgSrc}" alt="${escHtml(item.name)}" loading="lazy"
                        onerror="this.src='https://via.placeholder.com/280x180?text=Food'">
                    <span class="bsc-badge bsc-badge-search"><i class="fas fa-search"></i> Menu Match</span>
                </div>
                <div class="bsc-body">
                    <div class="bsc-name">${highlightMatch(escHtml(item.name), q)}</div>
                    <div class="bsc-price">₱${parseFloat(item.price).toFixed(2)}</div>
                    <div class="bsc-est">
                        <div class="bsc-eico">${estIcon}</div>
                        <div class="bsc-einfo">
                            <div class="bsc-ename">${highlightMatch(escHtml(estName), q)}</div>
                            <div class="bsc-emeta">
                                <span class="sp ${estStatus}">${estStatus.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <button class="bsc-btn"
                        onclick="event.stopPropagation();window.location.href='${URLS.estDetail}${estId}/'">
                        <i class="fas fa-store"></i> Visit Store
                    </button>
                </div>
            </div>`;
        }).join('');

        cidx = 0;
        track.style.transform = 'translateX(0)';
        updNav();

        // Trigger card animations
        requestAnimationFrame(() => {
            track.style.opacity = '1';
            track.querySelectorAll('.bsc').forEach(card => {
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
            });
        });
    }, 210);

    // ── Est grid sub-label ──
    setEstSubLabel(`Establishments with "<strong>${escHtml(q)}</strong>" on their menu`);
}

// ============================================
// BESTSELLERS AREA — ESTABLISHMENT RESULTS
// ============================================
function renderEstSearchInBS(ests, q) {
    const titleEl = document.getElementById('bsTitle');
    if (titleEl) {
        titleEl.style.transition = 'opacity .2s ease';
        titleEl.style.opacity = '0';
        setTimeout(() => {
            titleEl.innerHTML = `<i class="fas fa-store" style="color:var(--red);"></i>
                ${ests.length} food hub${ests.length !== 1 ? 's' : ''} matching
                "<strong>${escHtml(q)}</strong>"`;
            titleEl.style.opacity = '1';
        }, 180);
    }

    const track = document.getElementById('cTrack');
    if (!track) return;

    if (isGrid) {
        track.classList.remove('gmode');
        const wrap = document.getElementById('carouselWrap');
        if (wrap) wrap.classList.remove('gmode');
    }

    track.style.transition = 'opacity .2s ease';
    track.style.opacity = '0';

    setTimeout(() => {
        track.innerHTML = ests.map((est, i) => {
            const isOpen  = (est.status || '').toLowerCase() === 'open';
            const stClass = isOpen ? 'open' : 'closed';
            const estImg  = (typeof EST_IMG_MAP !== 'undefined' && EST_IMG_MAP[est.id]) || '';
            const imgSrc  = estImg
                || `https://via.placeholder.com/280x180?text=${encodeURIComponent(est.name)}`;

            return `<div class="bsc" onclick="window.location.href='${URLS.estDetail}${est.id}/'"
                style="opacity:0;transform:translateY(14px);transition:opacity .28s ease ${i * 45}ms,transform .28s ease ${i * 45}ms;">
                <div class="bsc-img">
                    <img src="${imgSrc}" alt="${escHtml(est.name)}" loading="lazy"
                        onerror="this.src='https://via.placeholder.com/280x180?text=Restaurant'">
                    <span class="bsc-badge bsc-badge-est"><i class="fas fa-store"></i> Food Hub</span>
                </div>
                <div class="bsc-body">
                    <div class="bsc-name">${highlightMatch(escHtml(est.name), q)}</div>
                    <div class="bsc-price" style="color:var(--g600);font-size:12px;">${escHtml(est.category || 'Food')}</div>
                    <div class="bsc-est">
                        <div class="bsc-einfo" style="padding-left:0;">
                            <div class="bsc-emeta">
                                <span class="sp ${stClass}">${(est.status || 'UNKNOWN').toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <button class="bsc-btn"
                        onclick="event.stopPropagation();window.location.href='${URLS.estDetail}${est.id}/'">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>`;
        }).join('');

        cidx = 0;
        track.style.transform = 'translateX(0)';
        updNav();

        requestAnimationFrame(() => {
            track.style.opacity = '1';
            track.querySelectorAll('.bsc').forEach(card => {
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
            });
        });
    }, 210);

    setEstSubLabel(`Showing establishments matching "<strong>${escHtml(q)}</strong>"`);
}

// ============================================
// EMPTY STATE in carousel area
// ============================================
function showBSSearchEmpty(q) {
    const titleEl = document.getElementById('bsTitle');
    if (titleEl) {
        titleEl.style.transition = 'opacity .2s ease';
        titleEl.style.opacity = '0';
        setTimeout(() => {
            titleEl.innerHTML = `<i class="fas fa-search" style="color:var(--g300);"></i>
                No results for "<strong>${escHtml(q)}</strong>"`;
            titleEl.style.opacity = '1';
        }, 180);
    }

    const track = document.getElementById('cTrack');
    if (track) {
        track.style.transition = 'opacity .2s ease';
        track.style.opacity = '0';
        setTimeout(() => {
            const sugg = [
                ...getRecents(),
                ...(_trendCache || []).map(e => e.name)
            ].filter(n => n.toLowerCase() !== q.toLowerCase()).slice(0, 5);

            track.innerHTML = `<div style="padding:48px 24px;text-align:center;width:100%;color:var(--g400);">
                <i class="fas fa-search" style="font-size:38px;color:var(--g200);display:block;margin-bottom:16px;"></i>
                <div style="font-size:16px;font-weight:700;color:var(--g700);margin-bottom:8px;">
                    No matches for "<strong style="color:var(--g900);">${escHtml(q)}</strong>"
                </div>
                <div style="font-size:13px;color:var(--g400);margin-bottom:${sugg.length ? '18px' : '0'};">
                    Try a different keyword — or browse all establishments below
                </div>
                ${sugg.length ? `
                <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">
                    ${sugg.map(s => `<span onclick="searchPillClick(${JSON.stringify(s)})"
                        style="background:#fff;border:2px solid var(--g200);border-radius:20px;padding:6px 16px;font-size:12px;font-weight:600;color:var(--g700);cursor:pointer;font-family:'Poppins',sans-serif;transition:all .18s;"
                        onmouseover="this.style.background='var(--red-light)';this.style.color='var(--red)';this.style.borderColor='rgba(183,28,28,.3)'"
                        onmouseout="this.style.background='#fff';this.style.color='var(--g700)';this.style.borderColor='var(--g200)'">${escHtml(s)}</span>`).join('')}
                </div>` : ''}
            </div>`;
            requestAnimationFrame(() => { track.style.opacity = '1'; });
        }, 210);
    }

    setEstSubLabel('');
}

// ============================================
// ESTABLISHMENT GRID — sort by match count
// Matching cards rise to top + staggered fade-in
// Non-matching cards hidden for focus
// ============================================
function sortEstCardsByMenuMatch(menuItems, q) {
    const grid = document.getElementById('estGrid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.food-est-item'));

    // Save original order (once)
    cards.forEach((card, i) => {
        if (!card.dataset.originalOrder) card.dataset.originalOrder = i;
    });

    // Build match map: estId → count
    const matchMap = {};
    menuItems.forEach(item => {
        if (item.establishment) {
            const id = item.establishment.id;
            matchMap[id] = (matchMap[id] || 0) + 1;
        }
    });

    // Remove old badges
    document.querySelectorAll('.est-match-badge').forEach(el => el.remove());

    // Tag each card + add match badge
    cards.forEach(card => {
        const id    = parseInt(card.dataset.id);
        const count = matchMap[id] || 0;
        card.dataset.matchCount = count;

        // Restore name first
        const nameEl = card.querySelector('.estc-name');
        if (nameEl && nameEl.dataset.origText) {
            nameEl.textContent = nameEl.dataset.origText;
        }

        if (count > 0) {
            card.style.display = '';

            // Highlight name text
            if (nameEl) {
                if (!nameEl.dataset.origText) nameEl.dataset.origText = nameEl.textContent;
                nameEl.innerHTML = hlText(escHtml(nameEl.dataset.origText), q);
            }

            // Match badge
            const badge = document.createElement('div');
            badge.className = 'est-match-badge';
            badge.innerHTML = `<i class="fas fa-utensils"></i> ${count} menu match${count > 1 ? 'es' : ''}`;
            const body = card.querySelector('.estc-body');
            if (body) body.insertBefore(badge, body.firstChild);
        } else {
            // Hide non-matching for a focused search experience
            card.style.display = 'none';
        }
    });

    // Sort: most matches first, preserve original order for ties
    cards.sort((a, b) => {
        const ma = parseInt(a.dataset.matchCount || 0);
        const mb = parseInt(b.dataset.matchCount || 0);
        if (mb !== ma) return mb - ma;
        return (parseInt(a.dataset.originalOrder) || 0) - (parseInt(b.dataset.originalOrder) || 0);
    });

    // Re-append all in sorted order, then stagger fade-in for visible ones
    const frag = document.createDocumentFragment();
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(12px)';
        card.style.transition = '';
        frag.appendChild(card);
    });
    grid.appendChild(frag);

    let delay = 0;
    cards.forEach(card => {
        if (parseInt(card.dataset.matchCount || 0) > 0) {
            setTimeout(() => {
                card.style.transition = 'opacity .25s ease, transform .25s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, delay);
            delay += 50;
        }
    });
}

// ============================================
// LIVE SEARCH DROPDOWN
// ============================================
function renderSearchDrop(data, q) {
    const drop    = document.getElementById('searchDropdown');
    const content = document.getElementById('searchDropdownContent');
    if (!drop || !content) return;
    dropSelected = -1;

    // OPEN-first
    const openFirst = arr => arr.slice().sort((a, b) => {
        const aO = ((a.establishment ? a.establishment.status : a.status)||'').toLowerCase()==='open' ? 0 : 1;
        const bO = ((b.establishment ? b.establishment.status : b.status)||'').toLowerCase()==='open' ? 0 : 1;
        return aO - bO;
    });

    const items = openFirst(data.menus || []);
    const ests  = openFirst(data.establishments || []);
    let html = '';

    // ── Menu items ──
    if (items.length > 0) {
        html += `<div class="search-dropdown-section">
            <div class="search-dropdown-title">
                <i class="fas fa-utensils"></i> Menu Items
                <span style="background:var(--red);color:#fff;font-size:9px;border-radius:10px;padding:1px 6px;margin-left:4px;">${items.length}</span>
            </div>`;
        items.slice(0, 5).forEach(item => {
            const estId   = item.establishment ? item.establishment.id   : '';
            const estName = item.establishment ? item.establishment.name : '';
            const estSt   = item.establishment ? (item.establishment.status || 'Closed') : 'Closed';
            const isO     = estSt.toLowerCase() === 'open';
            const stBg    = isO ? '#d1fae5' : '#fee2e2';
            const stFg    = isO ? '#065f46' : '#991b1b';
            const imgHtml = item.image_url
                ? `<img src="${escHtml(item.image_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;"
                    onerror="this.parentElement.innerHTML='<i class=\\'fas fa-utensils\\'></i>'">`
                : `<i class="fas fa-utensils"></i>`;
            const url = `${URLS.estDetail}${estId}/`;
            html += `<div class="search-dropdown-item"
                onclick="saveRecent(${JSON.stringify(item.name)});window.location.href='${url}'">
                <div class="search-dropdown-item-icon" style="overflow:hidden;">${imgHtml}</div>
                <div style="min-width:0;flex:1;">
                    <div class="search-dropdown-item-name">${highlightMatch(escHtml(item.name), q)}</div>
                    <div class="search-dropdown-item-meta">
                        <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;background:${stBg};color:${stFg};">${estSt}</span>
                        <span>•</span>
                        <i class="fas fa-store" style="font-size:9px;"></i>
                        <span>${highlightMatch(escHtml(estName), q)}</span>
                    </div>
                </div>
                <span style="margin-left:auto;font-size:12px;font-weight:700;color:var(--red);white-space:nowrap;flex-shrink:0;">
                    ₱${parseFloat(item.price || 0).toFixed(2)}
                </span>
            </div>`;
        });
        if (items.length > 5) {
            html += `<div style="padding:5px 16px 9px;font-size:11px;color:var(--g400);">
                +${items.length - 5} more shown in results below ↓</div>`;
        }
        html += '</div>';
    }

    // ── Establishments ──
    if (ests.length > 0) {
        html += `<div class="search-dropdown-section">
            <div class="search-dropdown-title">
                <i class="fas fa-store"></i> Food Hubs
                <span style="background:var(--red);color:#fff;font-size:9px;border-radius:10px;padding:1px 6px;margin-left:4px;">${ests.length}</span>
            </div>`;
        ests.slice(0, 4).forEach(est => {
            const isO    = (est.status || '').toLowerCase() === 'open';
            const stBg   = isO ? '#d1fae5' : '#fee2e2';
            const stFg   = isO ? '#065f46' : '#991b1b';
            const imgHtml = (typeof EST_IMG_MAP !== 'undefined' && EST_IMG_MAP[est.id])
                ? `<img src="${escHtml(EST_IMG_MAP[est.id])}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;"
                    onerror="this.parentElement.innerHTML='<i class=\\'fas fa-store\\'></i>'">`
                : `<i class="fas fa-store"></i>`;
            const url = `${URLS.estDetail}${est.id}/`;
            html += `<div class="search-dropdown-item"
                onclick="saveRecent(${JSON.stringify(est.name)});window.location.href='${url}'">
                <div class="search-dropdown-item-icon" style="overflow:hidden;">${imgHtml}</div>
                <div style="min-width:0;flex:1;">
                    <div class="search-dropdown-item-name">${highlightMatch(escHtml(est.name), q)}</div>
                    <div class="search-dropdown-item-meta">
                        <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;background:${stBg};color:${stFg};">${est.status || 'Unknown'}</span>
                        <span>•</span>
                        <span>${escHtml(est.category || 'Food')}</span>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    // ── No results ──
    if (!html) {
        const sugg = [
            ...getRecents(),
            ...(_trendCache || []).map(e => e.name)
        ].filter(n => n.toLowerCase() !== q.toLowerCase()).slice(0, 6);

        html = `<div class="search-no-results">
            <i class="fas fa-search" style="font-size:26px;color:var(--g300);display:block;margin-bottom:8px;"></i>
            <div style="font-weight:600;color:var(--g700);font-size:14px;margin-bottom:4px;">
                No results for "<strong>${escHtml(q)}</strong>"</div>
            <div style="font-size:11px;color:var(--g400);margin-bottom:${sugg.length ? '12px' : '0'};">
                Try a different keyword or browse below.</div>
            ${sugg.length ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">
                ${sugg.map(s => `<span onclick="searchPillClick(${JSON.stringify(s)})"
                    style="background:var(--g100);border:1px solid var(--g200);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:500;color:var(--g700);cursor:pointer;transition:all .15s;"
                    onmouseover="this.style.background='var(--red-light)';this.style.color='var(--red)'"
                    onmouseout="this.style.background='var(--g100)';this.style.color='var(--g700)'">${escHtml(s)}</span>`).join('')}
            </div>` : ''}
        </div>`;
    } else {
        // Footer hint
        html += `<div style="padding:10px 16px;font-size:11px;font-weight:600;color:var(--g600);text-align:center;border-top:1px solid var(--g100);">
            <i class="fas fa-arrow-down" style="color:var(--red);"></i>
            Full results updated below on the page
        </div>`;
    }

    content.innerHTML = html;
    drop.classList.add('active');
}

// ============================================
// EST SECTION SUB-LABEL (contextual filter info)
// ============================================
function setEstSubLabel(html) {
    let sub = document.getElementById('estSectionSub');
    if (!html) {
        if (sub) {
            sub.style.opacity = '0';
            setTimeout(() => { if (sub.parentNode) sub.parentNode.removeChild(sub); }, 250);
        }
        return;
    }
    if (!sub) {
        sub = document.createElement('div');
        sub.id = 'estSectionSub';
        sub.style.cssText = 'font-size:13px;font-weight:500;color:var(--g600);margin:-14px 0 18px;opacity:0;transition:opacity .3s ease;display:flex;align-items:center;gap:7px;';
        const secTitle = document.querySelector('.sec-title');
        if (secTitle && secTitle.parentNode) {
            secTitle.parentNode.insertBefore(sub, secTitle.nextSibling);
        }
    }
    sub.innerHTML = `<i class="fas fa-filter" style="color:var(--red);font-size:11px;"></i>${html}`;
    requestAnimationFrame(() => { sub.style.opacity = '1'; });
}

// ============================================
// PILL CLICK HELPERS
// ============================================
function searchPillClick(text) {
    const inp = document.getElementById('hSearch');
    const clr = document.getElementById('hClr');
    if (!inp) return;
    inp.value = text;
    if (clr) clr.classList.add('on');
    filterEstCards(text);
    fetchSearchResults(text);
    inp.focus();
}
function removeAndRefresh(text) { removeRecent(text); showIdleDrop(); }

function highlightMatch(text, q) {
    const re = new RegExp(`(${escapeRe(q)})`, 'gi');
    return text.replace(re, '<span class="search-match">$1</span>');
}

// ============================================
// SCROLL TO TOP
// ============================================
function initScrollTop() {
    const btn = document.getElementById('stb');
    window.addEventListener('scroll', () => btn.classList.toggle('on', window.pageYOffset > 300));
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(msg, type = 'success') {
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const bgColors = { success: '#f0fdf4', error: '#fef2f2', warning: '#fffbeb', info: '#eff6ff' };
    const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };

    // Get or create a shared toast container so multiple toasts stack nicely
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:none;`;
        document.body.appendChild(container);
    }

    const t = document.createElement('div');
    t.style.cssText = `background:${bgColors[type]||'#fff'};border-left:5px solid ${colors[type]||colors.info};border-radius:10px;padding:14px 20px;box-shadow:0 6px 24px rgba(0,0,0,0.15);display:flex;align-items:center;gap:12px;font-family:Poppins,sans-serif;font-size:14px;font-weight:500;color:#1f2937;min-width:280px;max-width:520px;pointer-events:auto;animation:toastSlideIn .35s cubic-bezier(.34,1.56,.64,1);`;
    t.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}" style="color:${colors[type]};font-size:18px;flex-shrink:0;"></i><span style="flex:1;">${escHtml(msg)}</span>`;

    // Inject keyframes once
    if (!document.getElementById('toastKeyframes')) {
        const style = document.createElement('style');
        style.id = 'toastKeyframes';
        style.textContent = `@keyframes toastSlideIn{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}`;
        document.head.appendChild(style);
    }

    container.appendChild(t);
    setTimeout(() => {
        t.style.transition = 'opacity .4s ease, transform .4s ease';
        t.style.opacity = '0';
        t.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            t.remove();
            if (container.children.length === 0) container.remove();
        }, 400);
    }, 3000);
}

// ============================================
// GLOBAL CLICK HANDLERS
// ============================================
document.addEventListener('click', e => {
    if (!e.target.closest('#ddw')) closeDD();
    if (!e.target.closest('#pcont')) {
        const pd = document.getElementById('pdrop');
        if (pd) pd.classList.remove('show');
    }
    if (!e.target.closest('.hsw')) {
        closeDrop();
    }
    // Close layer panel when clicking outside
    if (!e.target.closest('.map-layer-btn') && !e.target.closest('.map-layer-panel')) {
        const lp = document.getElementById('mapLayerPanel');
        if (lp) lp.classList.remove('show');
    }
    if (e.target === document.getElementById('bsMod')) closeMod();
    if (e.target === document.getElementById('setMod')) closeSet();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeMod(); closeSet(); closeDD(); }
});

window.addEventListener('resize', () => { if (!isGrid) updCar(); });

// ============================================
// UTILITIES
// ============================================
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeRe(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
// ============================================
// ESTABLISHMENT CARD NAVIGATION — safety net
// The <a> tag href already handles navigation.
// This sets child pointer-events to none so
// clicks on images/text bubble up to the <a>.
// ============================================
function initEstablishmentCards() {
    document.querySelectorAll('.estc.food-est-item').forEach(function(card) {
        card.style.pointerEvents = 'auto';
        card.style.cursor = 'pointer';
        // Let all child elements pass clicks through to the anchor
        card.querySelectorAll('*').forEach(function(child) {
            child.style.pointerEvents = 'none';
        });
    });