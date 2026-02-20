// ============================================
// KabsuEats.js — All functions connected to Django backend
// ============================================

// ── CAROUSEL STATE ──
let cidx = 0, isGrid = false;
const VISIBLE = 5;
let bsData = []; // real backend data

let curView = 'bs', mapReady = false;
let mapInst = null, curTile = null, mkLayer = null;
let esMapData = []; // real establishment data for map

// ── MODAL STATE ──
let currentModalItem = null;

// ── SEARCH STATE ──
let searchDebounceTimer = null;
let currentSearchQuery = '';
let searchMode = null; // null | 'menu' | 'establishment' | 'category'
let searchMenuData = []; // results from search_menu_items API

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
    initProfile();
    initScrollTop();
    fetchBestsellers();
    autoHideMessages();
    initEstablishmentCards();
    initSmartSearch();

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
                // Only render if not in search mode
                if (!searchMode) renderBS(bsData);
            } else {
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
// ✅ REFRESH BESTSELLER STATUSES IN REAL-TIME
// ============================================
function refreshBestsellerStatuses() {
    fetch(URLS.bestsellers)
        .then(res => res.json())
        .then(data => {
            if (!data.success || !data.bestsellers.length) return;
            data.bestsellers.forEach(fresh => {
                const idx = bsData.findIndex(x => x.id === fresh.id);
                if (idx !== -1) bsData[idx].establishment.status = fresh.establishment.status;
            });
            document.querySelectorAll('.bsc').forEach(card => {
                const onclickAttr = card.getAttribute('onclick') || '';
                const match = onclickAttr.match(/openMod\((\d+)\)/);
                if (!match) return;
                const itemId = parseInt(match[1]);
                const item = bsData.find(x => x.id === itemId);
                if (!item) return;
                const st = (item.establishment.status || 'closed').toLowerCase();
                const badge = card.querySelector('.sp');
                if (badge) { badge.className = `sp ${st}`; badge.textContent = st.toUpperCase(); }
            });
            if (currentModalItem) {
                const fresh = data.bestsellers.find(x => x.id === currentModalItem.id);
                if (fresh) {
                    currentModalItem.establishment.status = fresh.establishment.status;
                    const st = (fresh.establishment.status || 'closed').toLowerCase();
                    const stEl = document.getElementById('mEstS');
                    if (stEl) { stEl.className = `mests ${st}`; stEl.innerHTML = `<i class="fas fa-circle" style="font-size:8px"></i> ${cap(st)}`; }
                }
            }
        })
        .catch(() => {});
}

// ============================================
// RENDER BESTSELLER CARDS (original BS or search-menu results)
// ============================================
function renderBS(data, isSearchResult = false) {
    const track = document.getElementById('cTrack');
    if (!data || data.length === 0) {
        track.innerHTML = '<div style="padding:40px;color:#9ca3af;font-size:14px;text-align:center;width:100%">No results found.</div>';
        document.getElementById('cPrev').disabled = true;
        document.getElementById('cNext').disabled = true;
        return;
    }

    track.innerHTML = data.map(d => {
        const st = (d.establishment.status || 'closed').toLowerCase();
        const imgSrc = d.image || 'https://via.placeholder.com/280x180?text=' + encodeURIComponent(d.name);
        const estImg = EST_IMG_MAP[d.establishment.id] || '';
        const estIconHtml = estImg
            ? `<img src="${estImg}" alt="${escHtml(d.establishment.name)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-utensils\\'></i>'">`
            : `<i class="fas fa-utensils"></i>`;

        // Badge: "Best Seller" if is_top_seller=true or from original bsData, else "Menu Item" for search results
        const isBestSeller = d.is_top_seller !== undefined ? d.is_top_seller : true; // original bsData items are all top sellers
        const badgeHtml = isBestSeller
            ? `<span class="bsc-badge"><i class="fas fa-star"></i> Best Seller</span>`
            : `<span class="bsc-badge" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)"><i class="fas fa-utensils"></i> Menu Item</span>`;

        return `
        <div class="bsc" onclick="openMod(${d.id})">
            <div class="bsc-img">
                <img src="${imgSrc}" alt="${escHtml(d.name)}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/280x180?text=Food'">
                ${badgeHtml}
            </div>
            <div class="bsc-body">
                <div class="bsc-name">${escHtml(d.name)}</div>
                <div class="bsc-price">₱${parseFloat(d.price).toFixed(2)}</div>
                <div class="bsc-stats">
                    <span><i class="fas fa-shopping-bag"></i> ${d.total_orders || 0} orders</span>
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
            fetchMapEstablishments();
            if (!mapPollTimer) mapPollTimer = setInterval(fetchMapEstablishments, 30000);
        }
    }
    curView = v;
}


// ============================================
// LEAFLET MAP
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
        loadAllEstablishments();
        mapPollTimer = setInterval(loadAllEstablishments, 30000);
        mapInst.invalidateSize();
    }, 150);
}

function loadAllEstablishments() {
    fetch(`${URLS.nearbyEst}?lat=${CVSU.lat}&lng=${CVSU.lng}&radius=999999`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            const merged = data.establishments.map(e => {
                const local = (typeof EST_ALL_DATA !== 'undefined' && EST_ALL_DATA[e.id]) || {};
                return {
                    id: e.id,
                    name: local.name || e.name || '',
                    address: local.address || e.address || '',
                    image: local.image || '',
                    status: local.status || liveStatusCache[e.id] || '',
                    latitude: parseFloat(e.latitude),
                    longitude: parseFloat(e.longitude),
                    distance: e.distance || 0,
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

function renderFromLocalData() { loadAllEstablishments(); }
function refreshEstablishmentStatuses() { loadAllEstablishments(); }
function fetchMapEstablishments() { loadAllEstablishments(); }

function applyFiltersToData(data) {
    let result = [...data];
    const f = mapFilterState;
    if (f.status) result = result.filter(e => (e.status || '').toLowerCase() === f.status);
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
    if (!btn || !navigator.geolocation) { showToast('Geolocation not supported.', 'error'); return; }
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
        // Remove any search match badges if user manually filters
        const existing = el.querySelector('.est-match-badge');
        if (existing) existing.remove();
    });
}

// ============================================
// ── SMART SEARCH ENGINE ──
// ============================================

// ── Advanced Search Dropdown State ──
let asdFocusIdx = -1;
let asdRows = [];

function initSmartSearch() {
    const inp = document.getElementById('hSearch');
    const clr = document.getElementById('hClr');
    if (!inp) return;

    inp.addEventListener('focus', function () {
        const q = this.value.trim();
        if (!q) showAsdDefault();
    });

    inp.addEventListener('input', function () {
        const q = this.value.trim();
        clr.classList.toggle('on', q.length > 0);
        asdFocusIdx = -1;

        if (!q) {
            resetSearch();
            showAsdDefault();
            return;
        }
        showAsdForQuery(q);
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => runSmartSearch(q), 300);
    });

    inp.addEventListener('keydown', function (e) {
        const asd = document.getElementById('asd');
        if (!asd || !asd.classList.contains('open')) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            asdFocusIdx = Math.min(asdFocusIdx + 1, asdRows.length - 1);
            highlightAsdRow();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            asdFocusIdx = Math.max(asdFocusIdx - 1, 0);
            highlightAsdRow();
        } else if (e.key === 'Enter') {
            if (asdFocusIdx >= 0 && asdRows[asdFocusIdx]) {
                e.preventDefault();
                asdRows[asdFocusIdx].click();
            }
        } else if (e.key === 'Escape') {
            closeAsd();
        }
    });

    clr.addEventListener('click', function () {
        inp.value = '';
        clr.classList.remove('on');
        resetSearch();
        showAsdDefault();
        inp.focus();
    });

    // Close ASD on outside click
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.hsw')) closeAsd();
    });
}

// ── Show default suggestions (no query) ──
function showAsdDefault() {
    const asd = document.getElementById('asd');
    const inner = document.getElementById('asdInner');
    if (!asd || !inner) return;

    const data = (typeof SUGGEST_DATA !== 'undefined') ? SUGGEST_DATA : { establishments: [], categories: [] };
    let html = '';

    // Recent searches from localStorage (if available)
    let recents = [];
    try { recents = JSON.parse(localStorage.getItem('kse_recent') || '[]'); } catch(e) {}
    if (recents.length > 0) {
        html += `<div class="asd-section">
            <div class="asd-section-title"><i class="fas fa-history"></i> Recent Searches</div>`;
        recents.slice(0, 3).forEach(r => {
            html += `<div class="asd-row" data-type="recent" data-val="${escHtml(r)}" onclick="pickAsd('${escHtml(r)}','recent')">
                <div class="asd-ico hist"><i class="fas fa-history"></i></div>
                <div class="asd-text"><div class="asd-name">${escHtml(r)}</div></div>
                <i class="fas fa-arrow-up-left asd-arrow" style="transform:rotate(45deg)"></i>
            </div>`;
        });
        html += `</div>`;
    }

    // Categories
    if (data.categories.length > 0) {
        html += `<div class="asd-section">
            <div class="asd-section-title"><i class="fas fa-tags"></i> Browse by Category</div>`;
        data.categories.slice(0, 5).forEach(cat => {
            html += `<div class="asd-row" data-type="cat" data-val="${escHtml(cat)}" onclick="pickAsd('${escHtml(cat)}','cat')">
                <div class="asd-ico cat"><i class="fas fa-tag"></i></div>
                <div class="asd-text"><div class="asd-name">${escHtml(cat)}</div></div>
                <i class="fas fa-chevron-right asd-arrow"></i>
            </div>`;
        });
        html += `</div>`;
    }

    // Top establishments
    if (data.establishments.length > 0) {
        html += `<div class="asd-section">
            <div class="asd-section-title"><i class="fas fa-store"></i> Popular Establishments</div>`;
        data.establishments.slice(0, 3).forEach(est => {
            const stClass = est.status === 'open' ? 'open' : 'closed';
            const stLabel = est.status === 'open' ? 'Open' : 'Closed';
            html += `<div class="asd-row" data-type="est" data-id="${est.id}" onclick="window.location.href='${(typeof URLS !== 'undefined' ? URLS.estDetail : '/food_establishment/')}${est.id}/'">
                <div class="asd-ico est"><i class="fas fa-utensils"></i></div>
                <div class="asd-text">
                    <div class="asd-name">${escHtml(est.name)}</div>
                    <div class="asd-meta">${escHtml(est.category || '')} <span class="asd-badge ${stClass}">${stLabel}</span></div>
                </div>
                <i class="fas fa-chevron-right asd-arrow"></i>
            </div>`;
        });
        html += `</div>`;
    }

    if (!html) { closeAsd(); return; }
    inner.innerHTML = html;
    asd.classList.add('open');
    document.getElementById('hsHints') && (document.getElementById('hsHints').style.opacity = '0');
    rebuildAsdRows();
}

// ── Show suggestions for a typed query ──
function showAsdForQuery(q) {
    const asd = document.getElementById('asd');
    const inner = document.getElementById('asdInner');
    if (!asd || !inner) return;

    const qLow = q.toLowerCase();
    const data = (typeof SUGGEST_DATA !== 'undefined') ? SUGGEST_DATA : { establishments: [], categories: [] };
    let html = '';
    let totalResults = 0;

    // Matching establishments
    const estMatches = data.establishments.filter(e => e.name.toLowerCase().includes(qLow)).slice(0, 4);
    if (estMatches.length > 0) {
        html += `<div class="asd-section">
            <div class="asd-section-title"><i class="fas fa-store"></i> Establishments</div>`;
        estMatches.forEach(est => {
            const stClass = est.status === 'open' ? 'open' : 'closed';
            const stLabel = est.status === 'open' ? 'Open' : 'Closed';
            const hl = highlightMatch(est.name, qLow);
            html += `<div class="asd-row" data-type="est" data-id="${est.id}" onclick="window.location.href='${(typeof URLS !== 'undefined' ? URLS.estDetail : '/food_establishment/')}${est.id}/'">
                <div class="asd-ico est"><i class="fas fa-utensils"></i></div>
                <div class="asd-text">
                    <div class="asd-name">${hl}</div>
                    <div class="asd-meta">${escHtml(est.category || '')} <span class="asd-badge ${stClass}">${stLabel}</span></div>
                </div>
                <i class="fas fa-chevron-right asd-arrow"></i>
            </div>`;
            totalResults++;
        });
        html += `</div>`;
    }

    // Matching categories
    const catMatches = data.categories.filter(c => c.toLowerCase().includes(qLow)).slice(0, 3);
    if (catMatches.length > 0) {
        html += `<div class="asd-section">
            <div class="asd-section-title"><i class="fas fa-tags"></i> Categories</div>`;
        catMatches.forEach(cat => {
            const hl = highlightMatch(cat, qLow);
            html += `<div class="asd-row" data-type="cat" data-val="${escHtml(cat)}" onclick="pickAsd('${escHtml(cat)}','cat')">
                <div class="asd-ico cat"><i class="fas fa-tag"></i></div>
                <div class="asd-text"><div class="asd-name">${hl}</div><div class="asd-meta">Browse all ${escHtml(cat)} restaurants</div></div>
                <i class="fas fa-chevron-right asd-arrow"></i>
            </div>`;
            totalResults++;
        });
        html += `</div>`;
    }

    // Menu item search row (always show if no establishment match)
    if (estMatches.length === 0 && catMatches.length === 0) {
        html += `<div class="asd-section">
            <div class="asd-row" data-type="menu" data-val="${escHtml(q)}" onclick="pickAsd('${escHtml(q)}','menu')">
                <div class="asd-ico menu"><i class="fas fa-search"></i></div>
                <div class="asd-text">
                    <div class="asd-name">Search menu items for "<strong>${escHtml(q)}</strong>"</div>
                    <div class="asd-meta">Find dishes across all restaurants</div>
                </div>
                <i class="fas fa-chevron-right asd-arrow"></i>
            </div>
        </div>`;
        totalResults++;
    } else {
        // Also offer menu search as last option
        html += `<div class="asd-section">
            <div class="asd-row" data-type="menu" data-val="${escHtml(q)}" onclick="pickAsd('${escHtml(q)}','menu')">
                <div class="asd-ico menu"><i class="fas fa-utensils"></i></div>
                <div class="asd-text">
                    <div class="asd-name">Find dishes: "<strong>${escHtml(q)}</strong>"</div>
                    <div class="asd-meta">Search menu items across all restaurants</div>
                </div>
                <i class="fas fa-chevron-right asd-arrow"></i>
            </div>
        </div>`;
    }

    inner.innerHTML = html;
    asd.classList.add('open');
    document.getElementById('hsHints') && (document.getElementById('hsHints').style.opacity = '0');
    rebuildAsdRows();
}

function rebuildAsdRows() {
    asdRows = Array.from(document.querySelectorAll('#asd .asd-row'));
    asdFocusIdx = -1;
}
function highlightAsdRow() {
    asdRows.forEach((r, i) => r.classList.toggle('focused', i === asdFocusIdx));
    if (asdFocusIdx >= 0 && asdRows[asdFocusIdx]) {
        asdRows[asdFocusIdx].scrollIntoView({ block: 'nearest' });
    }
}
function highlightMatch(text, query) {
    const re = new RegExp('(' + escapeRe(query) + ')', 'gi');
    return escHtml(text).replace(re, '<mark>$1</mark>');
}
function closeAsd() {
    const asd = document.getElementById('asd');
    if (asd) asd.classList.remove('open');
    const hints = document.getElementById('hsHints');
    if (hints) hints.style.opacity = '';
}

// ── Pick a suggestion from the dropdown ──
function pickAsd(val, type) {
    const inp = document.getElementById('hSearch');
    const clr = document.getElementById('hClr');
    if (inp) { inp.value = val; clr && clr.classList.add('on'); }
    closeAsd();

    // Save to recents
    try {
        let recents = JSON.parse(localStorage.getItem('kse_recent') || '[]');
        recents = [val, ...recents.filter(r => r !== val)].slice(0, 6);
        localStorage.setItem('kse_recent', JSON.stringify(recents));
    } catch(e) {}

    if (type === 'cat') {
        // Apply category filter
        const catFilt = document.getElementById('catFilt');
        if (catFilt) {
            const opt = Array.from(catFilt.options).find(o => o.value.toLowerCase() === val.toLowerCase());
            if (opt) { catFilt.value = opt.value; applyFilter(); }
            else runSmartSearch(val);
        } else runSmartSearch(val);
    } else {
        runSmartSearch(val);
    }
}

// ── Classify what the user is searching for ──
function classifyQuery(q) {
    const qLow = q.toLowerCase();

    // Check if it matches a category
    const allCats = [];
    document.querySelectorAll('#catFilt option').forEach(o => {
        if (o.value) allCats.push(o.value.toLowerCase());
    });
    const matchesCat = allCats.some(c => c.includes(qLow) || qLow.includes(c));
    if (matchesCat) return 'category';

    // Check if it matches an establishment name
    let estMatch = false;
    document.querySelectorAll('.food-est-item').forEach(el => {
        const name = (el.dataset.name || '').toLowerCase();
        if (name.includes(qLow)) estMatch = true;
    });
    if (estMatch) return 'establishment';

    // Default: search menus
    return 'menu';
}

// ── Main search dispatcher ──
function runSmartSearch(q) {
    currentSearchQuery = q;
    const qLow = q.toLowerCase();

    // Determine mode — check both est names and categories first for specificity
    let mode = 'menu'; // default
    let estMatchCount = 0;
    document.querySelectorAll('.food-est-item').forEach(el => {
        const name = (el.dataset.name || '').toLowerCase();
        if (name.includes(qLow)) estMatchCount++;
    });

    // Check categories
    let catMatchCount = 0;
    document.querySelectorAll('#catFilt option').forEach(o => {
        if (o.value && o.value.toLowerCase().includes(qLow)) catMatchCount++;
    });
    // Also check data-category on est cards
    document.querySelectorAll('.food-est-item').forEach(el => {
        const cat = (el.dataset.category || '').toLowerCase();
        if (cat.includes(qLow)) catMatchCount++;
    });

    if (catMatchCount > 0 && estMatchCount === 0) {
        mode = 'category';
    } else if (estMatchCount > 0) {
        mode = 'establishment';
    } else {
        mode = 'menu';
    }

    searchMode = mode;

    if (mode === 'establishment') {
        doEstablishmentSearch(qLow);
    } else if (mode === 'category') {
        doCategorySearch(qLow);
    } else {
        doMenuSearch(q);
    }
}

// ── ESTABLISHMENT SEARCH ──
function doEstablishmentSearch(qLow) {
    // Hide bestsellers section
    hideBsSection();

    // Show section title update
    updateSecTitle('<i class="fas fa-store"></i> Matching Establishments');

    // Filter establishments
    let hasVisible = false;
    document.querySelectorAll('.food-est-item').forEach(el => {
        const name = (el.dataset.name || '').toLowerCase();
        const isMatch = name.includes(qLow);
        el.style.display = isMatch ? '' : 'none';
        if (isMatch) { hasVisible = true; removeMatchBadge(el); }
    });

    if (!hasVisible) showNoEstMsg('No establishments match "' + currentSearchQuery + '"');
    else clearNoEstMsg();
}

// ── CATEGORY SEARCH ──
function doCategorySearch(qLow) {
    // Hide bestsellers section
    hideBsSection();

    // Show section title update
    updateSecTitle('<i class="fas fa-tags"></i> Category: ' + cap(currentSearchQuery));

    // Filter establishments by category
    let hasVisible = false;
    document.querySelectorAll('.food-est-item').forEach(el => {
        const cat = (el.dataset.category || '').toLowerCase();
        const name = (el.dataset.name || '').toLowerCase();
        const isMatch = cat.includes(qLow) || name.includes(qLow);
        el.style.display = isMatch ? '' : 'none';
        if (isMatch) { hasVisible = true; removeMatchBadge(el); }
    });

    if (!hasVisible) showNoEstMsg('No establishments found for "' + currentSearchQuery + '"');
    else clearNoEstMsg();
}

// ── MENU SEARCH ──
function doMenuSearch(q) {
    const qLow = q.toLowerCase();

    // Show bestsellers section (with menu results)
    showBsSection();

    // Show loading in carousel
    document.getElementById('cTrack').innerHTML =
        '<div class="sk-card"><div class="sk sk-img"></div><div class="sk sk-ln" style="margin-top:13px"></div><div class="sk sk-ln s"></div><div class="sk sk-bt"></div></div>'.repeat(5);

    // Update BS title
    const bsTitle = document.getElementById('bsTitle');
    if (bsTitle) bsTitle.innerHTML = `<i class="fas fa-search"></i> Menu results for "${escHtml(q)}"`;

    // Fetch menu items
    fetch(`${URLS.searchMenu}?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            searchMenuData = data.items;

            // Merge into allData for modal: combine with bsData (bsData takes precedence for existing items)
            // Build a combined list: searchMenuData items not in bsData get added temporarily
            renderBS(searchMenuData, true);

            // Auto-sort establishments: those that have a matching menu item come first
            // and get a match badge indicator
            const matchingEstIds = new Set(searchMenuData.map(i => i.establishment.id));
            const matchCount = {};
            searchMenuData.forEach(i => {
                matchCount[i.establishment.id] = (matchCount[i.establishment.id] || 0) + 1;
            });

            sortEstablishmentsWithMatches(matchingEstIds, matchCount, qLow);
        })
        .catch(() => {
            // Fallback: filter bsData by name
            const filtered = bsData.filter(d => d.name.toLowerCase().includes(qLow));
            renderBS(filtered, true);
            if (filtered.length === 0) {
                document.getElementById('cTrack').innerHTML =
                    `<div style="padding:40px;color:#9ca3af;font-size:14px;text-align:center;width:100%">No menu items found for "${escHtml(q)}"</div>`;
            }
        });
}

// ── Sort and badge establishments for menu search ──
function sortEstablishmentsWithMatches(matchingEstIds, matchCount, qLow) {
    const grid = document.getElementById('estGrid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.food-est-item'));

    // Remove old match badges
    cards.forEach(c => removeMatchBadge(c));

    // Show all cards
    cards.forEach(c => { c.style.display = ''; });

    // Sort: matched first
    cards.sort((a, b) => {
        const aId = parseInt(a.dataset.id || 0);
        const bId = parseInt(b.dataset.id || 0);
        const aMatch = matchingEstIds.has(aId) ? 1 : 0;
        const bMatch = matchingEstIds.has(bId) ? 1 : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;
        // Secondary sort: more matches first
        return (matchCount[bId] || 0) - (matchCount[aId] || 0);
    });

    // Re-append in sorted order and add badges
    cards.forEach(card => {
        const id = parseInt(card.dataset.id || 0);
        if (matchingEstIds.has(id)) {
            const cnt = matchCount[id] || 1;
            addMatchBadge(card, cnt, qLow);
        }
        grid.appendChild(card);
    });
}

// ── Add match indicator badge to est card ──
function addMatchBadge(card, count, query) {
    removeMatchBadge(card);
    const body = card.querySelector('.estc-body');
    if (!body) return;
    const badge = document.createElement('div');
    badge.className = 'est-match-badge';
    badge.innerHTML = `<i class="fas fa-utensils"></i><strong>${count}</strong>&nbsp;item${count > 1 ? 's' : ''} match <em>"${escHtml(query)}"</em>`;
    body.insertBefore(badge, body.firstChild);
}

function removeMatchBadge(card) {
    const existing = card.querySelector('.est-match-badge');
    if (existing) existing.remove();
}

// ── Show/hide bestsellers section ──
function showBsSection() {
    const sec = document.getElementById('bsSec');
    if (sec) sec.style.display = '';
    if (curView === 'bs') {
        const cw = document.getElementById('carouselWrap');
        if (cw) cw.style.display = '';
    }
}

function hideBsSection() {
    const sec = document.getElementById('bsSec');
    if (sec) sec.style.display = 'none';
}

// ── Update the establishments section title ──
function updateSecTitle(html) {
    const t = document.querySelector('.sec-title');
    if (t) t.innerHTML = html;
}

function restoreSecTitle() {
    const t = document.querySelector('.sec-title');
    if (t) t.innerHTML = '<i class="fas fa-store"></i> Food Establishments';
}

// ── No-est message helpers ──
function showNoEstMsg(msg) {
    clearNoEstMsg();
    const grid = document.getElementById('estGrid');
    if (!grid) return;
    const div = document.createElement('p');
    div.className = 'no-est-msg search-no-est';
    div.textContent = msg;
    grid.appendChild(div);
}

function clearNoEstMsg() {
    document.querySelectorAll('.search-no-est').forEach(e => e.remove());
}

// ── RESET SEARCH — restore everything to original state ──
function resetSearch() {
    currentSearchQuery = '';
    searchMode = null;
    searchMenuData = [];

    // Restore BS section visibility
    const bsSec = document.getElementById('bsSec');
    if (bsSec) bsSec.style.display = '';

    // Restore carousel wrapper (critical — menu search hides it)
    if (curView === 'bs') {
        const cw = document.getElementById('carouselWrap');
        if (cw) cw.style.display = '';
    }

    // Restore BS title
    const bsTitle = document.getElementById('bsTitle');
    if (bsTitle) bsTitle.innerHTML = '<i class="fas fa-fire"></i> Top-rated items from all our partner establishments';

    // Re-render original bsData (if loaded); if still loading, let fetchBestsellers handle it
    if (bsData.length > 0) {
        renderBS(bsData, false);
    } else {
        // bsData hasn't loaded yet — re-fetch to populate the carousel
        fetchBestsellers();
    }

    // Restore establishment grid
    const grid = document.getElementById('estGrid');
    if (grid) {
        // Remove all match badges and show all cards
        grid.querySelectorAll('.food-est-item').forEach(card => {
            removeMatchBadge(card);
            card.style.display = '';
        });

        // Restore original DOM order using saved reference
        if (grid._originalOrder && grid._originalOrder.length > 0) {
            grid._originalOrder.forEach(c => grid.appendChild(c));
        }
    }

    // Restore section title
    restoreSecTitle();

    // Clear no-est messages
    clearNoEstMsg();

    // Re-apply category filter if active
    const catFilt = document.getElementById('catFilt');
    if (catFilt && catFilt.value) applyFilter();
}

// ── Save original establishment order on DOM ready ──
document.addEventListener('DOMContentLoaded', function () {
    const grid = document.getElementById('estGrid');
    if (grid) {
        grid._originalOrder = Array.from(grid.querySelectorAll('.food-est-item'));
    }
});

// ============================================
// BESTSELLER MODAL — opens with backend data
// ============================================
function openMod(id) {
    // Search in bsData first, then searchMenuData
    let d = bsData.find(x => x.id === id);
    if (!d) d = searchMenuData.find(x => x.id === id);
    if (!d) return;

    currentModalItem = d;
    const imgSrc = d.image || 'https://via.placeholder.com/400x380?text=' + encodeURIComponent(d.name);
    document.getElementById('mImg').src = imgSrc;

    // Show/hide Best Seller badge on modal
    const mBadge = document.querySelector('.m-bsbadge');
    if (mBadge) {
        const isBs = d.is_top_seller !== undefined ? d.is_top_seller : true;
        mBadge.style.display = isBs ? 'flex' : 'none';
    }

    document.getElementById('mName').textContent = d.name;
    document.getElementById('mDesc').textContent = d.description || '';
    document.getElementById('mPrice').textContent = `₱${parseFloat(d.price).toFixed(2)}`;
    document.getElementById('mStock').innerHTML = `<i class="fas fa-box"></i> ${d.quantity} Items`;
    document.getElementById('mEstN').textContent = d.establishment.name;
    document.getElementById('mEstA').textContent = d.establishment.address || '';

    const st = (d.establishment.status || 'closed').toLowerCase();
    const stEl = document.getElementById('mEstS');
    stEl.className = `mests ${st}`;
    stEl.innerHTML = `<i class="fas fa-circle" style="font-size:8px"></i> ${cap(st)}`;

    document.getElementById('mqty').value = 1;
    document.getElementById('bsMod').classList.add('on');
    document.body.style.overflow = 'hidden';

    // Fetch fresh status
    fetch(URLS.bestsellers)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            const fresh = data.bestsellers.find(x => x.id === id);
            if (!fresh) return;
            const idx = bsData.findIndex(x => x.id === id);
            if (idx !== -1) bsData[idx].establishment.status = fresh.establishment.status;
            currentModalItem = (idx !== -1 ? bsData[idx] : currentModalItem);
            const freshSt = (fresh.establishment.status || 'closed').toLowerCase();
            const el = document.getElementById('mEstS');
            if (el) { el.className = `mests ${freshSt}`; el.innerHTML = `<i class="fas fa-circle" style="font-size:8px"></i> ${cap(freshSt)}`; }
        })
        .catch(() => {});
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
// ADD TO CART
// ============================================
function addToCartFromModal() {
    if (!IS_AUTHENTICATED) { window.location.href = URLS.login; return; }
    if (!currentModalItem) return;
    const qty = parseInt(document.getElementById('mqty').value) || 1;

    const btn = document.getElementById('addToCartBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...'; }

    fetch(URLS.addToCart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify({ menu_item_id: currentModalItem.id, quantity: qty })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            closeMod();
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
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart'; }
    });
}

// ============================================
// BUY NOW
// ============================================
function buyNowFromModal() {
    if (!IS_AUTHENTICATED) { window.location.href = URLS.login; return; }
    if (!currentModalItem) return;
    const qty = parseInt(document.getElementById('mqty').value) || 1;

    const btn = document.getElementById('buyNowBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }

    fetch(URLS.addToCart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify({ menu_item_id: currentModalItem.id, quantity: qty })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            window.location.href = URLS.cart + '?pay=1';
        } else {
            showToast(data.message || data.error || 'Could not process Buy Now.', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now'; }
        }
    })
    .catch(() => {
        showToast('Network error. Please try again.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now'; }
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
// PROFILE IMAGE
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
            document.getElementById('profilePreview').innerHTML =
                `<img src="${newUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            const nav = document.getElementById('pavBtn');
            if (nav) nav.innerHTML = `<img src="${newUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            const da = document.querySelector('.pd-av');
            if (da) da.innerHTML = `<img src="${newUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
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
// ESTABLISHMENT CARD NAVIGATION
// ============================================
function initEstablishmentCards() {
    document.querySelectorAll('.estc.food-est-item').forEach(function(card) {
        card.style.pointerEvents = 'auto';
        card.style.cursor = 'pointer';
        card.querySelectorAll('*:not(.est-match-badge)').forEach(function(child) {
            child.style.pointerEvents = 'none';
        });
    });
}