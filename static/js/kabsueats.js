// ============================================
// KabsuEats.js — All functions connected to Django backend
// ============================================

// ── CAROUSEL STATE ──
let cidx = 0, isGrid = false;
const VISIBLE = 5;
let bsData = []; // real backend data

// ── SEARCH MODE STATE ──
// Tracks current search state to restore UI when cleared
let searchMode = 'none'; // 'none' | 'menu' | 'establishment'
let lastSearchQuery = '';

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
// SMART SEARCH SYSTEM
// ─────────────────────────────────────────────
// FOCUS (empty)   → Initial dropdown: Recent + Category chips + All Establishments
// TYPING (menu)   → Dropdown shows menu items; BS carousel fills with menu results;
//                   Establishment cards sort by match count + amber badge + ring
// TYPING (est/cat)→ Dropdown shows ests; BS carousel fills with establishment cards
// CLEAR / DELETE  → Everything reverts to original instantly
// ============================================

// ── Recent Searches (localStorage) ──
const RECENT_KEY   = 'ke_recent_searches';
const RECENT_LIMIT = 8;
function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
}
function saveRecent(q) {
    if (!q || q.length < 2) return;
    let list = getRecent().filter(r => r.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT))); } catch {}
}
function clearRecent() { try { localStorage.removeItem(RECENT_KEY); } catch {} }

// ── State ──
let searchTimer  = null;
let searchAbort  = null;
let dropSelected = -1;
let bsHidden     = false;

// ─────────────────────────────────────────────
// BS SECTION — smooth hide / show animation
// Only used when user types but BEFORE API returns.
// Once results arrive, the section stays visible and
// the carousel content is simply swapped.
// ─────────────────────────────────────────────
function hideBSSection() {
    const sec = document.getElementById('bsSec');
    if (!sec || bsHidden) return;
    sec.style.transition = 'none';
    sec.style.overflow   = 'hidden';
    sec.style.maxHeight  = sec.scrollHeight + 'px';
    sec.getBoundingClientRect(); // force reflow
    sec.style.transition = 'max-height .35s ease, opacity .25s ease';
    sec.style.maxHeight  = '0px';
    sec.style.opacity    = '0';
    bsHidden = true;
}
function showBSSection() {
    const sec = document.getElementById('bsSec');
    if (!sec || !bsHidden) return;
    sec.style.transition = 'max-height .38s ease, opacity .28s ease';
    sec.style.maxHeight  = '3000px';
    sec.style.opacity    = '1';
    bsHidden = false;
    setTimeout(() => {
        sec.style.overflow = sec.style.maxHeight = sec.style.transition = '';
    }, 420);
}

// ─────────────────────────────────────────────
// INIT SEARCH
// ─────────────────────────────────────────────
function initSearch() {
    const inp = document.getElementById('hSearch');
    const clr = document.getElementById('hClr');
    if (!inp) return;

    // Save original card order once
    document.querySelectorAll('.food-est-item').forEach((c, i) => { c.dataset.originalOrder = i; });

    // ── Typing ──
    inp.addEventListener('input', function () {
        const q = this.value.trim();
        clr.classList.toggle('on', q.length > 0);
        dropSelected = -1;
        clearTimeout(searchTimer);

        if (!q) {
            closeDrop();
            restoreNormalView();   // snap everything back
            showBSSection();
            return;
        }

        // Optimistic instant: filter est cards + show skeleton
        filterEstCardsByText(q);
        showDropSkeleton();
        searchTimer = setTimeout(() => doSearch(q), 240);
    });

    // ── Clear button ──
    clr.addEventListener('click', function () {
        inp.value = '';
        this.classList.remove('on');
        closeDrop();
        restoreNormalView();
        showBSSection();
        inp.focus();
        showInitialDrop();
    });

    // ── Focus ──
    inp.addEventListener('focus', function () {
        const q = this.value.trim();
        if (q) doSearch(q);
        else   showInitialDrop();
    });

    // ── Keyboard nav ──
    inp.addEventListener('keydown', function (e) {
        const items = document.querySelectorAll('#searchDropdownContent .search-dropdown-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            dropSelected = Math.min(dropSelected + 1, items.length - 1);
            items.forEach((el, i) => el.style.background = i === dropSelected ? 'var(--g50)' : '');
            if (dropSelected >= 0) items[dropSelected].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            dropSelected = Math.max(dropSelected - 1, -1);
            items.forEach((el, i) => el.style.background = i === dropSelected ? 'var(--g50)' : '');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (dropSelected >= 0 && items[dropSelected]) items[dropSelected].click();
            else if (this.value.trim()) doSearch(this.value.trim());
        } else if (e.key === 'Escape') {
            closeDrop(); this.blur();
        }
    });

    // ── Hint pills ──
    document.querySelectorAll('.hs-hint-pill').forEach(pill => {
        pill.addEventListener('click', function (e) {
            if (this.tagName === 'A') return;
            e.preventDefault();
            const text = this.textContent.trim().replace(/^[^\w]+/, '').trim();
            inp.value = text; clr.classList.add('on');
            filterEstCardsByText(text); doSearch(text); inp.focus();
        });
    });
}

function closeDrop() {
    const d = document.getElementById('searchDropdown');
    if (d) d.classList.remove('active');
    dropSelected = -1;
}

// ─────────────────────────────────────────────
// INSTANT DOM FILTER (runs on every keypress)
// ─────────────────────────────────────────────
function filterEstCardsByText(q) {
    const ql = (q || '').toLowerCase();
    document.querySelectorAll('.food-est-item').forEach(el => {
        if (!ql) { el.style.display = ''; return; }
        const name = (el.dataset.name || el.querySelector('.estc-name')?.textContent || '').toLowerCase();
        const cat  = (el.dataset.category || '').toLowerCase();
        el.style.display = (name.includes(ql) || cat.includes(ql)) ? '' : 'none';
    });
}

// ─────────────────────────────────────────────
// SKELETON while API loads
// ─────────────────────────────────────────────
function showDropSkeleton() {
    const drop = document.getElementById('searchDropdown');
    const cont = document.getElementById('searchDropdownContent');
    if (!drop || !cont) return;
    const shimStyle = 'background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:200% 100%;animation:shim 1.2s infinite;border-radius:4px;';
    cont.innerHTML = `<div style="padding:14px 16px 10px;">
        <div style="height:10px;width:38%;margin-bottom:12px;${shimStyle}"></div>
        ${[1,2,3,4].map(() => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:11px;">
            <div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;${shimStyle}"></div>
            <div style="flex:1;">
                <div style="height:11px;width:60%;margin-bottom:5px;${shimStyle}"></div>
                <div style="height:9px;width:42%;${shimStyle}"></div>
            </div></div>`).join('')}
    </div>`;
    drop.classList.add('active');
}

// ─────────────────────────────────────────────
// INITIAL DROPDOWN (focus, empty input)
// Recent Searches | Category Chips | All Establishments
// ─────────────────────────────────────────────
function showInitialDrop() {
    if (searchAbort) { try { searchAbort.abort(); } catch(e){} }
    searchAbort = new AbortController();
    fetch(`${URLS.searchMenu}?q=`, { signal: searchAbort.signal })
        .then(r => r.json()).then(renderInitialDrop).catch(() => {});
}

function renderInitialDrop(data) {
    const drop = document.getElementById('searchDropdown');
    const cont = document.getElementById('searchDropdownContent');
    if (!drop || !cont) return;
    const recent = getRecent();
    const ests   = data.establishments || [];
    const cats   = data.categories     || [];
    let html = '';

    // Recent Searches
    if (recent.length) {
        html += `<div class="sd-section">
            <div class="sd-title" style="justify-content:space-between;">
                <span><i class="fas fa-history" style="color:#6b7280;margin-right:5px;"></i>Recent Searches</span>
                <button class="sd-clear-btn" onclick="handleClearRecent(event)"><i class="fas fa-trash-alt"></i> Clear all</button>
            </div>`;
        recent.forEach(r => {
            const s = escHtml(r).replace(/'/g, "\\'");
            html += `<div class="sd-row" onclick="handleRecentClick(event,'${s}')">
                <div class="sd-ico sd-ico--recent"><i class="fas fa-history"></i></div>
                <div class="sd-row-text"><span class="sd-row-name">${escHtml(r)}</span></div>
                <button class="sd-remove-btn" onclick="handleRemoveRecent(event,'${s}')"><i class="fas fa-times"></i></button>
            </div>`;
        });
        html += '</div>';
    }

    // Category chips
    if (cats.length) {
        html += `<div class="sd-section">
            <div class="sd-title"><i class="fas fa-tags" style="color:#f59e0b;margin-right:5px;"></i>Browse by Category</div>
            <div class="sd-chips">`;
        cats.forEach(c => {
            const s = escHtml(c).replace(/'/g, "\\'");
            html += `<button class="sd-chip" onclick="handleCatChip(event,'${s}')"><i class="fas fa-tag"></i> ${escHtml(c)}</button>`;
        });
        html += '</div></div>';
    }

    // All Establishments
    if (ests.length) {
        html += `<div class="sd-section">
            <div class="sd-title"><i class="fas fa-store" style="color:#B71C1C;margin-right:5px;"></i>All Establishments</div>`;
        ests.slice(0, 10).forEach(est => {
            const open = est.status === 'Open';
            const imgH = est.image_url
                ? `<img src="${escHtml(est.image_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-store\\'></i>'">`
                : `<i class="fas fa-store"></i>`;
            html += `<div class="sd-row" onclick="window.location.href='${URLS.estDetail}${est.id}/'">
                <div class="sd-ico" style="overflow:hidden;">${imgH}</div>
                <div class="sd-row-text">
                    <span class="sd-row-name">${escHtml(est.name)}</span>
                    <span class="sd-row-meta">
                        <span class="sd-status ${open ? 'open' : 'closed'}">${est.status}</span>
                        <span class="sd-dot">•</span>${escHtml(est.category)}
                    </span>
                </div>
            </div>`;
        });
        if (ests.length > 10) html += `<div class="sd-more">+${ests.length - 10} more — type to search</div>`;
        html += '</div>';
    }

    if (!html) html = `<div class="sd-empty"><i class="fas fa-utensils"></i><span>Start typing to search food or restaurants</span></div>`;

    cont.innerHTML = html;
    drop.classList.add('active');
}

// ─────────────────────────────────────────────
// MAIN SEARCH — fetch + update dropdown + page
// ─────────────────────────────────────────────
function doSearch(q) {
    if (!q) return;
    if (searchAbort) { try { searchAbort.abort(); } catch(e){} }
    searchAbort = new AbortController();
    lastSearchQuery = q;

    fetch(`${URLS.searchMenu}?q=${encodeURIComponent(q)}`, { signal: searchAbort.signal })
        .then(r => r.json())
        .then(data => {
            renderLiveDropdown(data, q);
            applyResultsToPage(data, q);
        })
        .catch(err => { if (err.name !== 'AbortError') closeDrop(); });
}

// ─────────────────────────────────────────────
// APPLY RESULTS TO PAGE
// Menus:   → fill BS carousel with menu cards + sort est cards
// Est/Cat: → fill BS carousel with est cards (bestsellers temporarily hidden)
// None:    → show no-result state in carousel
// ─────────────────────────────────────────────
function applyResultsToPage(data, q) {
    const menus = data.menus          || [];
    const ests  = data.establishments || [];

    // Always make BS section visible (carousel will have new content)
    showBSSection();

    if (menus.length) {
        searchMode = 'menu';
        fillCarouselWithMenuItems(menus, q);
        sortEstCardsByMatch(menus);
    } else if (ests.length) {
        searchMode = 'establishment';
        fillCarouselWithEstablishments(ests, q);
        clearEstBadges();
    } else {
        searchMode = 'empty';
        showNoResultsCarousel(q);
        clearEstBadges();
    }
}

// ─────────────────────────────────────────────
// CAROUSEL: fill with MENU ITEMS
// ─────────────────────────────────────────────
function fillCarouselWithMenuItems(items, q) {
    const titleEl = document.getElementById('bsTitle');
    if (titleEl) titleEl.innerHTML =
        `<i class="fas fa-utensils" style="color:#B71C1C;"></i>
         Menu results for <em class="srch-em">"${escHtml(q)}"</em>`;

    // Force list mode during search
    if (isGrid) {
        document.getElementById('cTrack')?.classList.remove('gmode');
        document.getElementById('carouselWrap')?.classList.remove('gmode');
    }

    const track = document.getElementById('cTrack');
    if (!track) return;

    track.innerHTML = items.map(item => {
        const eid  = item.establishment?.id   || '';
        const enm  = item.establishment?.name || '';
        const est  = (item.establishment?.status || 'closed').toLowerCase();
        const eimg = (typeof EST_IMG_MAP !== 'undefined' && EST_IMG_MAP[eid]) || '';
        const iSrc = item.image_url || `https://via.placeholder.com/280x180?text=${encodeURIComponent(item.name)}`;
        const icon = eimg
            ? `<img src="${eimg}" alt="${escHtml(enm)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-utensils\\'></i>'">`
            : `<i class="fas fa-utensils"></i>`;
        return `<div class="bsc srch-bsc" onclick="window.location.href='${URLS.estDetail}${eid}/'">
            <div class="bsc-img">
                <img src="${iSrc}" alt="${escHtml(item.name)}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/280x180?text=Food'">
                <span class="bsc-badge srch-badge srch-badge--menu"><i class="fas fa-utensils"></i> Menu Item</span>
            </div>
            <div class="bsc-body">
                <div class="bsc-name">${highlightMatch(escHtml(item.name), q)}</div>
                <div class="bsc-price">₱${parseFloat(item.price).toFixed(2)}</div>
                <div class="bsc-est">
                    <div class="bsc-eico">${icon}</div>
                    <div class="bsc-einfo">
                        <div class="bsc-ename">${escHtml(enm)}</div>
                        <div class="bsc-emeta"><span class="sp ${est}">${est.toUpperCase()}</span></div>
                    </div>
                </div>
                <button class="bsc-btn" onclick="event.stopPropagation();window.location.href='${URLS.estDetail}${eid}/'">
                    <i class="fas fa-store"></i> Visit Store
                </button>
            </div>
        </div>`;
    }).join('');

    cidx = 0;
    track.style.transform = 'translateX(0)';
    updNav();
}

// ─────────────────────────────────────────────
// CAROUSEL: fill with ESTABLISHMENTS
// ─────────────────────────────────────────────
function fillCarouselWithEstablishments(ests, q) {
    const titleEl = document.getElementById('bsTitle');
    if (titleEl) titleEl.innerHTML =
        `<i class="fas fa-store" style="color:#B71C1C;"></i>
         Establishments matching <em class="srch-em">"${escHtml(q)}"</em>`;

    if (isGrid) {
        document.getElementById('cTrack')?.classList.remove('gmode');
        document.getElementById('carouselWrap')?.classList.remove('gmode');
    }

    const track = document.getElementById('cTrack');
    if (!track) return;

    track.innerHTML = ests.map(est => {
        const open = est.status === 'Open';
        const iSrc = est.image_url
            || (typeof EST_IMG_MAP !== 'undefined' && EST_IMG_MAP[est.id])
            || `https://via.placeholder.com/280x180?text=${encodeURIComponent(est.name)}`;
        const matchBadge = est.menu_match_count > 0
            ? `<div class="srch-menu-match">
                   <i class="fas fa-utensils"></i>
                   ${est.menu_match_count} menu match${est.menu_match_count > 1 ? 'es' : ''}
               </div>`
            : '';
        return `<div class="bsc srch-bsc" onclick="window.location.href='${URLS.estDetail}${est.id}/'">
            <div class="bsc-img">
                <img src="${iSrc}" alt="${escHtml(est.name)}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/280x180?text=Restaurant'">
                <span class="bsc-badge srch-badge srch-badge--est"><i class="fas fa-store"></i> Establishment</span>
            </div>
            <div class="bsc-body">
                ${matchBadge}
                <div class="bsc-name">${highlightMatch(escHtml(est.name), q)}</div>
                <div class="bsc-cat">${escHtml(est.category || 'Food')}</div>
                <div class="bsc-est" style="margin-bottom:8px;">
                    <div class="bsc-einfo" style="padding-left:0;">
                        <div class="bsc-emeta">
                            <span class="sp ${open ? 'open' : 'closed'}">${est.status}</span>
                        </div>
                    </div>
                </div>
                <button class="bsc-btn" onclick="event.stopPropagation();window.location.href='${URLS.estDetail}${est.id}/'">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>`;
    }).join('');

    cidx = 0;
    track.style.transform = 'translateX(0)';
    updNav();
}

// ─────────────────────────────────────────────
// CAROUSEL: no results state
// ─────────────────────────────────────────────
function showNoResultsCarousel(q) {
    const titleEl = document.getElementById('bsTitle');
    if (titleEl) titleEl.innerHTML =
        `<i class="fas fa-search" style="color:#9ca3af;"></i>
         <span style="color:#9ca3af;">No results for "${escHtml(q)}"</span>`;
    const track = document.getElementById('cTrack');
    if (track) track.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
             width:100%;padding:48px 24px;text-align:center;">
            <i class="fas fa-search" style="font-size:32px;color:#e5e7eb;margin-bottom:12px;"></i>
            <div style="font-size:14px;font-weight:600;color:#374151;margin-bottom:4px;">
                No items or restaurants matching "${escHtml(q)}"
            </div>
            <div style="font-size:12px;color:#9ca3af;">Try a different keyword or browse below</div>
        </div>`;
}

// ─────────────────────────────────────────────
// SORT ESTABLISHMENT CARDS BY MENU MATCH COUNT
// Cards with more menu matches bubble to top.
// Each matched card gets an amber badge + amber ring.
// ─────────────────────────────────────────────
function sortEstCardsByMatch(menuItems) {
    const grid = document.getElementById('estGrid');
    if (!grid) return;

    // Build match map  { estId → count }
    const matchMap = {};
    menuItems.forEach(item => {
        if (item.establishment?.id) {
            const id = item.establishment.id;
            matchMap[id] = (matchMap[id] || 0) + 1;
        }
    });

    const cards = Array.from(grid.querySelectorAll('.food-est-item'));

    // Clear old badges + rings
    clearEstBadges(cards);

    // Apply new badges + rings
    cards.forEach(card => {
        const id    = parseInt(card.dataset.id);
        const count = matchMap[id] || 0;
        card.dataset.matchCount = count;

        if (count > 0) {
            card.style.display       = '';   // ensure visible even if filtered
            card.style.outline       = '2px solid #f59e0b';
            card.style.outlineOffset = '-2px';

            const badge = document.createElement('div');
            badge.className = 'est-match-badge';
            badge.innerHTML = `<i class="fas fa-utensils"></i> ${count} menu match${count > 1 ? 'es' : ''}`;
            const body = card.querySelector('.estc-body');
            if (body) body.insertBefore(badge, body.firstChild);
        }
    });

    // Sort: highest match → top; then preserve original order
    cards.sort((a, b) => {
        const ma = parseInt(a.dataset.matchCount || 0);
        const mb = parseInt(b.dataset.matchCount || 0);
        if (mb !== ma) return mb - ma;
        return (parseInt(a.dataset.originalOrder) || 0) - (parseInt(b.dataset.originalOrder) || 0);
    });
    cards.forEach(c => grid.appendChild(c));
}

function clearEstBadges(cards) {
    const list = cards || Array.from(document.querySelectorAll('.food-est-item'));
    list.forEach(card => {
        card.querySelector('.est-match-badge')?.remove();
        card.dataset.matchCount  = 0;
        card.style.outline       = '';
        card.style.outlineOffset = '';
    });
}

// ─────────────────────────────────────────────
// RESTORE NORMAL VIEW (on clear)
// ─────────────────────────────────────────────
function restoreNormalView() {
    if (searchMode === 'none') return;
    searchMode      = 'none';
    lastSearchQuery = '';

    // Restore BS title
    const titleEl = document.getElementById('bsTitle');
    if (titleEl) titleEl.innerHTML =
        '<i class="fas fa-fire"></i> Top-rated items from all our partner establishments';

    // Restore bestseller carousel
    if (bsData && bsData.length) renderBS(bsData);
    else fetchBestsellers();

    // Remove all match indicators
    clearEstBadges();

    // Restore original card order + visibility
    const grid = document.getElementById('estGrid');
    if (grid) {
        const cards = Array.from(grid.querySelectorAll('.food-est-item'));
        cards.forEach(c => { c.style.display = ''; });
        cards.sort((a, b) =>
            (parseInt(a.dataset.originalOrder) || 0) - (parseInt(b.dataset.originalOrder) || 0)
        );
        cards.forEach(c => grid.appendChild(c));
    }
}

// ─────────────────────────────────────────────
// LIVE DROPDOWN  (while typing)
// Menu Items | Establishments | Categories | Suggestions
// ─────────────────────────────────────────────
function renderLiveDropdown(data, q) {
    const drop = document.getElementById('searchDropdown');
    const cont = document.getElementById('searchDropdownContent');
    if (!drop || !cont) return;
    dropSelected = -1;

    const menus  = data.menus          || [];
    const ests   = data.establishments || [];
    const cats   = data.categories     || [];
    const suggs  = data.suggestions    || [];
    let html = '';

    // ── Menu Items ──
    if (menus.length) {
        html += `<div class="sd-section">
            <div class="sd-title">
                <i class="fas fa-utensils" style="color:#B71C1C;margin-right:5px;"></i>Menu Items
                <span class="sd-count">${menus.length}</span>
            </div>`;
        menus.slice(0, 6).forEach(item => {
            const eid  = item.establishment?.id   || '';
            const enm  = item.establishment?.name || '';
            const imgH = item.image_url
                ? `<img src="${escHtml(item.image_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-utensils\\'></i>'">`
                : `<i class="fas fa-utensils"></i>`;
            const qs = escHtml(q).replace(/'/g, "\\'");
            html += `<div class="sd-row" onclick="saveRecentAndGo(event,'${qs}','${URLS.estDetail}${eid}/')">
                <div class="sd-ico sd-ico--menu" style="overflow:hidden;">${imgH}</div>
                <div class="sd-row-text">
                    <span class="sd-row-name">${highlightMatch(escHtml(item.name), q)}</span>
                    <span class="sd-row-meta">
                        <strong style="color:#B71C1C;">₱${parseFloat(item.price).toFixed(2)}</strong>
                        <span class="sd-dot">•</span>
                        <i class="fas fa-store" style="font-size:9px;"></i> ${highlightMatch(escHtml(enm), q)}
                    </span>
                </div>
                <i class="fas fa-chevron-right sd-chev"></i>
            </div>`;
        });
        if (menus.length > 6) html += `<div class="sd-more">+${menus.length - 6} more — see results in carousel ↓</div>`;
        html += '</div>';
    }

    // ── Establishments ──
    if (ests.length) {
        html += `<div class="sd-section">
            <div class="sd-title">
                <i class="fas fa-store" style="color:#B71C1C;margin-right:5px;"></i>Establishments
                <span class="sd-count">${ests.length}</span>
            </div>`;
        ests.slice(0, 5).forEach(est => {
            const open    = est.status === 'Open';
            const localImg = typeof EST_IMG_MAP !== 'undefined' ? EST_IMG_MAP[est.id] : '';
            const imgSrc  = est.image_url || localImg;
            const imgH    = imgSrc
                ? `<img src="${escHtml(imgSrc)}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-store\\'></i>'">`
                : `<i class="fas fa-store"></i>`;
            const matchChip = est.menu_match_count > 0
                ? `<span class="sd-match-chip"><i class="fas fa-utensils"></i> ${est.menu_match_count} item${est.menu_match_count > 1 ? 's' : ''}</span>`
                : '';
            const qs = escHtml(q).replace(/'/g, "\\'");
            html += `<div class="sd-row" onclick="saveRecentAndGo(event,'${qs}','${URLS.estDetail}${est.id}/')">
                <div class="sd-ico" style="overflow:hidden;">${imgH}</div>
                <div class="sd-row-text">
                    <span class="sd-row-name">${highlightMatch(escHtml(est.name), q)}</span>
                    <span class="sd-row-meta" style="flex-wrap:wrap;gap:4px;">
                        <span class="sd-status ${open ? 'open' : 'closed'}">${est.status}</span>
                        <span class="sd-dot">•</span>${escHtml(est.category)}${matchChip}
                    </span>
                </div>
                <i class="fas fa-chevron-right sd-chev"></i>
            </div>`;
        });
        html += '</div>';
    }

    // ── Categories ──
    if (cats.length) {
        html += `<div class="sd-section">
            <div class="sd-title"><i class="fas fa-tags" style="color:#f59e0b;margin-right:5px;"></i>Categories</div>
            <div class="sd-chips" style="padding:4px 14px 12px;">`;
        cats.forEach(c => {
            const s = escHtml(c).replace(/'/g, "\\'");
            html += `<button class="sd-chip" onclick="handleCatChip(event,'${s}')"><i class="fas fa-tag"></i> ${highlightMatch(escHtml(c), q)}</button>`;
        });
        html += '</div></div>';
    }

    // ── Did you mean… ──
    if (!menus.length && !ests.length && suggs.length) {
        html += `<div class="sd-section">
            <div class="sd-title" style="color:#f59e0b;"><i class="fas fa-lightbulb" style="color:#f59e0b;margin-right:5px;"></i>Did you mean…</div>`;
        suggs.forEach(s => {
            const safe = escHtml(s.text).replace(/'/g, "\\'");
            html += `<div class="sd-row" onclick="handleSuggestionClick(event,'${safe}')">
                <div class="sd-ico sd-ico--suggest"><i class="fas fa-search"></i></div>
                <div class="sd-row-text">
                    <span class="sd-row-name" style="color:#b45309;">${escHtml(s.text)}</span>
                    <span class="sd-row-meta">${escHtml(s.sub || '')}</span>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    if (!html) html = `<div class="sd-empty">
        <i class="fas fa-search"></i>
        <div style="font-weight:600;color:#374151;margin-bottom:3px;">No results for "${escHtml(q)}"</div>
        <div style="font-size:11px;color:#9ca3af;">Try a different keyword</div>
    </div>`;

    cont.innerHTML = html;
    drop.classList.add('active');
}

// ─────────────────────────────────────────────
// INLINE EVENT HANDLERS (called from rendered HTML)
// ─────────────────────────────────────────────
function handleRecentClick(e, q) {
    e.stopPropagation();
    const inp = document.getElementById('hSearch');
    const clr = document.getElementById('hClr');
    if (!inp) return;
    inp.value = q; clr.classList.add('on');
    filterEstCardsByText(q); doSearch(q);
}
function handleRemoveRecent(e, q) {
    e.stopPropagation();
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(
            getRecent().filter(r => r.toLowerCase() !== q.toLowerCase())
        ));
    } catch {}
    showInitialDrop();
}
function handleClearRecent(e) {
    e.stopPropagation();
    clearRecent();
    showInitialDrop();
}
function handleCatChip(e, cat) {
    e.stopPropagation();
    const inp = document.getElementById('hSearch');
    const clr = document.getElementById('hClr');
    if (!inp) return;
    inp.value = cat; clr.classList.add('on');
    filterEstCardsByText(cat); doSearch(cat); inp.focus();
}
function saveRecentAndGo(e, q, url) { saveRecent(q); window.location.href = url; }
function handleSuggestionClick(e, text) {
    e.stopPropagation();
    const inp = document.getElementById('hSearch');
    const clr = document.getElementById('hClr');
    if (!inp) return;
    inp.value = text; clr.classList.add('on');
    filterEstCardsByText(text); doSearch(text);
}

function highlightMatch(text, q) {
    if (!q) return text;
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
}