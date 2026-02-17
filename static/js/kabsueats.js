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
function maxIdx() { return Math.max(0, bsData.length - VISIBLE); }

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
                    distance: e.distance || 0
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
// BUY NOW — Redirects to payment selection page
// ✅ FIX: Creates order then redirects to buynow checkout page
//         where user picks Cash or Online Payment
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

    const formData = new FormData();
    formData.append('menu_item_id', currentModalItem.id);
    formData.append('quantity', qty);
    formData.append('csrfmiddlewaretoken', getCsrf());

    // ✅ FIX: POST to buynow_prepare (creates order, returns order_id)
    //         then redirect to buynow_checkout page
    fetch(URLS.prepareBuyNow, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf() },
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.success && data.order_id) {
            // ✅ Redirect to checkout page with payment method selection
            window.location.href = URLS.buynowCheckout + '?order_id=' + data.order_id;
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
// SEARCH — real-time dropdown (establishments + menus)
// ============================================
let searchTimer = null;
let searchAbort = null;   // AbortController for in-flight requests
let searchFocused = false;
let dropSelected = -1;    // keyboard nav index

function initSearch() {
    const inp  = document.getElementById('hSearch');
    const clr  = document.getElementById('hClr');
    const drop = document.getElementById('searchDropdown');
    if (!inp) return;

    // ── Input: debounce 260ms ──
    inp.addEventListener('input', function () {
        const q = this.value.trim();
        clr.classList.toggle('on', q.length > 0);
        dropSelected = -1;
        clearTimeout(searchTimer);

        if (q.length < 2) {
            closeDrop();
            filterEstCards('');   // restore all cards
            return;
        }

        // Show skeleton immediately
        showDropSkeleton();
        filterEstCards(q);        // filter DOM cards in real-time

        searchTimer = setTimeout(() => fetchSearchResults(q), 260);
    });

    // ── Clear button ──
    clr.addEventListener('click', function () {
        inp.value = '';
        this.classList.remove('on');
        closeDrop();
        filterEstCards('');
        inp.focus();
    });

    // ── Focus: show dropdown if query exists ──
    inp.addEventListener('focus', function () {
        searchFocused = true;
        if (this.value.trim().length >= 2) {
            fetchSearchResults(this.value.trim());
        }
    });

    // ── Keyboard navigation ──
    inp.addEventListener('keydown', function (e) {
        const items = document.querySelectorAll('.search-dropdown-item');
        if (!items.length) return;

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
            if (dropSelected >= 0 && items[dropSelected]) {
                items[dropSelected].click();
            }
        } else if (e.key === 'Escape') {
            closeDrop();
        }
    });

    // ── Hint pills — clicking a pill searches for it ──
    document.querySelectorAll('.hs-hint-pill').forEach(pill => {
        pill.addEventListener('click', function (e) {
            // Only intercept if it's a plain span (not an anchor to a real page)
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

// ── Filter DOM establishment cards instantly ──
function filterEstCards(q) {
    const ql = q.toLowerCase();
    document.querySelectorAll('.food-est-item').forEach(el => {
        if (!ql) { el.style.display = ''; return; }
        const name = (el.dataset.name     || '').toLowerCase();
        const cat  = (el.dataset.category || '').toLowerCase();
        el.style.display = (name.includes(ql) || cat.includes(ql)) ? '' : 'none';
    });
}

// ── Skeleton while loading ──
function showDropSkeleton() {
    const drop    = document.getElementById('searchDropdown');
    const content = document.getElementById('searchDropdownContent');
    content.innerHTML = `
        <div style="padding:14px 16px;">
            <div style="height:11px;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shim 1.2s infinite;border-radius:6px;margin-bottom:10px;width:40%"></div>
            ${[1,2,3].map(() => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shim 1.2s infinite;"></div>
                <div style="flex:1;">
                    <div style="height:12px;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shim 1.2s infinite;border-radius:4px;margin-bottom:6px;width:65%"></div>
                    <div style="height:10px;background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shim 1.2s infinite;border-radius:4px;width:45%"></div>
                </div>
            </div>`).join('')}
        </div>`;
    drop.classList.add('active');
}

// ── Main API fetch ──
function fetchSearchResults(q) {
    // Cancel any pending request
    if (searchAbort) { try { searchAbort.abort(); } catch(e) {} }
    searchAbort = new AbortController();

    fetch(`${URLS.searchMenu}?q=${encodeURIComponent(q)}`, { signal: searchAbort.signal })
        .then(r => r.json())
        .then(data => renderSearchDrop(data, q))
        .catch(err => {
            if (err.name !== 'AbortError') closeDrop();
        });
}

// ── Render results ──
function renderSearchDrop(data, q) {
    const drop    = document.getElementById('searchDropdown');
    const content = document.getElementById('searchDropdownContent');
    dropSelected  = -1;

    const items = data.menus          || [];
    const ests  = data.establishments || [];
    let html = '';

    // ── Menu Items section ──
    if (items.length > 0) {
        html += `<div class="search-dropdown-section">
            <div class="search-dropdown-title"><i class="fas fa-utensils"></i> Menu Items</div>`;
        items.slice(0, 6).forEach(item => {
            const estId   = item.establishment ? item.establishment.id   : '';
            const estName = item.establishment ? item.establishment.name : '';
            // API returns image_url, not image
            const imgSrc  = item.image_url
                ? `<img src="${escHtml(item.image_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-utensils\\'></i>'">`
                : `<i class="fas fa-utensils"></i>`;
            html += `<div class="search-dropdown-item" onclick="window.location.href='${URLS.estDetail}${estId}/'">
                <div class="search-dropdown-item-icon" style="overflow:hidden;">${imgSrc}</div>
                <div style="min-width:0;flex:1;">
                    <div class="search-dropdown-item-name">${highlightMatch(escHtml(item.name), q)}</div>
                    <div class="search-dropdown-item-meta">
                        <span style="color:#B71C1C;font-weight:700;">₱${parseFloat(item.price).toFixed(2)}</span>
                        <span>•</span>
                        <i class="fas fa-store" style="font-size:9px;"></i>
                        <span>${highlightMatch(escHtml(estName), q)}</span>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    // ── Establishments section ──
    if (ests.length > 0) {
        html += `<div class="search-dropdown-section">
            <div class="search-dropdown-title"><i class="fas fa-store"></i> Establishments</div>`;
        ests.slice(0, 4).forEach(est => {
            const isOpen   = est.status === 'Open';
            const stColor  = isOpen ? '#10b981' : '#ef4444';
            const stDot    = `<span style="width:6px;height:6px;border-radius:50%;background:${stColor};display:inline-block;flex-shrink:0;"></span>`;
            const estImgSrc = (typeof EST_IMG_MAP !== 'undefined' && EST_IMG_MAP[est.id])
                ? `<img src="${escHtml(EST_IMG_MAP[est.id])}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-store\\'></i>'">`
                : `<i class="fas fa-store"></i>`;
            html += `<div class="search-dropdown-item" onclick="window.location.href='${URLS.estDetail}${est.id}/'">
                <div class="search-dropdown-item-icon" style="overflow:hidden;">${estImgSrc}</div>
                <div style="min-width:0;flex:1;">
                    <div class="search-dropdown-item-name">${highlightMatch(escHtml(est.name), q)}</div>
                    <div class="search-dropdown-item-meta">
                        ${stDot}
                        <span style="color:${stColor};font-weight:600;">${est.status}</span>
                        <span>•</span>
                        <span>${escHtml(est.category)}</span>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    // ── No results ──
    if (!html) {
        html = `<div class="search-no-results">
            <i class="fas fa-search" style="font-size:22px;margin-bottom:8px;display:block;color:#d1d5db;"></i>
            <div style="font-weight:600;color:#374151;margin-bottom:4px;">No results for "${escHtml(q)}"</div>
            <div style="font-size:11px;color:#9ca3af;">Try a different keyword or browse below</div>
        </div>`;
    }

    content.innerHTML = html;
    drop.classList.add('active');
}

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
    const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#fff;border-left:5px solid ${colors[type]||colors.info};border-radius:10px;padding:14px 20px;box-shadow:0 6px 20px rgba(0,0,0,0.15);display:flex;align-items:center;gap:12px;z-index:99999;font-family:Poppins,sans-serif;font-size:14px;font-weight:500;color:#1f2937;min-width:280px;animation:slideInDown .3s ease;`;
    t.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}" style="color:${colors[type]};font-size:18px;"></i><span>${escHtml(msg)}</span>`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, 3000);
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
}