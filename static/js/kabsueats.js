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
// RENDER BESTSELLER CARDS
// ============================================
function renderBS(data) {
    const track = document.getElementById('cTrack');
    if (!data || data.length === 0) {
        track.innerHTML = '<div style="padding:40px;color:#9ca3af;font-size:14px;text-align:center;width:100%">No bestsellers available.</div>';
        return;
    }

    track.innerHTML = data.map(d => {
        const st = d.establishment.status.toLowerCase(); // "open" or "closed"
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
// LEAFLET MAP — satellite default, all establishments, real-time
// ============================================
const TILES = {
    street:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                            opt: { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 } },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', opt: { attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, AEA, GIS User Community', maxZoom: 20 } },
    topo:      { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                              opt: { attribution: '&copy; OpenTopoMap', maxZoom: 17 } },
    dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                opt: { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 20 } }
};

let mapPollTimer = null;

function initMap() {
    setTimeout(() => {
        // ── Default: satellite, max zoom (19) ──
        mapInst = L.map('esMap', { center: [CVSU.lat, CVSU.lng], zoom: 19 });
        curTile = L.tileLayer(TILES.satellite.url, TILES.satellite.opt).addTo(mapInst);

        // 500m radius circle
        L.circle([CVSU.lat, CVSU.lng], {
            color: '#B71C1C', fillColor: 'rgba(183,28,28,0.08)',
            fillOpacity: 0.35, weight: 2, radius: RADIUS, dashArray: '6 4'
        }).addTo(mapInst);

        // CvSU center marker
        const cvIco = L.divIcon({
            html: `<div style="background:#B71C1C;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 3px 10px rgba(183,28,28,.5);border:3px solid #fff"><i class="fas fa-university"></i></div>`,
            className: '', iconSize: [36, 36], iconAnchor: [18, 18]
        });
        L.marker([CVSU.lat, CVSU.lng], { icon: cvIco }).addTo(mapInst)
            .bindPopup('<div style="font-family:Poppins,sans-serif;font-weight:700;font-size:13px;">📍 CvSU-Bacoor (Center)</div>');

        mkLayer = L.layerGroup().addTo(mapInst);

        // Initial load then poll every 30 s for real-time updates
        fetchMapEstablishments();
        mapPollTimer = setInterval(fetchMapEstablishments, 30000);

        mapInst.invalidateSize();
    }, 150);
}

function fetchMapEstablishments() {
    // Use 50 km radius to capture ALL registered establishments regardless of location
    const url = `${URLS.nearbyEst}?lat=${CVSU.lat}&lng=${CVSU.lng}&radius=50000`;
    fetch(url)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                // Merge API data with server-rendered EST_ALL_DATA for status + image
                const merged = data.establishments.map(e => {
                    const local = (typeof EST_ALL_DATA !== 'undefined' && EST_ALL_DATA[e.id]) || {};
                    return {
                        ...e,
                        status:  local.status  || e.status || '',
                        image:   local.image   || '',
                        address: local.address || e.address || '',
                        name:    local.name    || e.name    || ''
                    };
                });
                // Also add any establishments in EST_ALL_DATA that might be missing from API
                if (typeof EST_ALL_DATA !== 'undefined') {
                    const apiIds = new Set(data.establishments.map(e => e.id));
                    Object.entries(EST_ALL_DATA).forEach(([id, d]) => {
                        if (!apiIds.has(parseInt(id)) && d.lat && d.lng) {
                            merged.push({ id: parseInt(id), ...d, latitude: d.lat, longitude: d.lng, distance: 0 });
                        }
                    });
                }
                esMapData = merged;
                renderMarkers(esMapData);
            }
        })
        .catch(() => {});
}

function renderMarkers(data) {
    if (!mkLayer) return;
    mkLayer.clearLayers();
    data.forEach(e => {
        if (!e.latitude || !e.longitude) return;
        const st  = (e.status || '').toLowerCase();
        const bg  = st === 'open' ? '#10b981' : st === 'closed' ? '#ef4444' : '#6b7280';
        const ring = st === 'open' ? '#d1fae5' : st === 'closed' ? '#fee2e2' : '#e5e7eb';

        // Build marker icon — show establishment image thumbnail if available
        const imgHtml = e.image
            ? `<img src="${e.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas fa-utensils\\'></i>'">`
            : `<i class="fas fa-utensils"></i>`;
        const ico = L.divIcon({
            html: `<div style="background:${bg};color:#fff;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,.35);border:3px solid #fff;overflow:hidden;">${imgHtml}</div>
                   <div style="width:10px;height:10px;background:${bg};border-radius:50%;border:2px solid ${ring};position:absolute;bottom:-2px;right:-2px;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
            className: '', iconSize: [38, 38], iconAnchor: [19, 19]
        });

        const dist = e.distance < 1000 ? `${Math.round(e.distance)}m` : `${(e.distance/1000).toFixed(2)}km`;
        const distRow = e.distance > 0 ? `<div class="mpop-dist" style="margin-top:6px"><i class="fas fa-route"></i> ${dist} from CvSU-Bacoor</div>` : '';
        const statusLabel = st ? cap(st) : 'Unknown';
        const imgPreview = e.image
            ? `<img src="${e.image}" style="width:100%;height:60px;object-fit:cover;border-radius:7px;margin-bottom:8px;" onerror="this.remove()">`
            : '';

        const popup = `<div class="mpop">
            ${imgPreview}
            <div class="mpop-name">${escHtml(e.name)}</div>
            <div class="mpop-cat">${escHtml(e.address || '')}</div>
            <span class="mpop-st ${st}"><i class="fas fa-circle" style="font-size:7px"></i> ${statusLabel}</span>
            ${distRow}
            <button class="mpop-btn" onclick="window.location.href='${URLS.estDetail}${e.id}/'">
                <i class="fas fa-eye"></i> View Details
            </button>
        </div>`;

        L.marker([parseFloat(e.latitude), parseFloat(e.longitude)], { icon: ico })
            .addTo(mkLayer)
            .bindPopup(popup, { maxWidth: 230 });
    });
}

function switchTile(t) {
    if (!mapInst) return;
    document.querySelectorAll('.mtb').forEach(b => b.classList.remove('on'));
    document.getElementById('mts-' + t).classList.add('on');
    if (curTile) mapInst.removeLayer(curTile);
    curTile = L.tileLayer(TILES[t].url, TILES[t].opt).addTo(mapInst);
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
    const st = (d.establishment.status || 'closed').toLowerCase();
    const stEl = document.getElementById('mEstS');
    stEl.className = `mests ${st}`;
    stEl.innerHTML = `<i class="fas fa-circle" style="font-size:8px"></i> ${cap(st)}`;
    document.getElementById('mqty').value = 1;
    document.getElementById('bsMod').classList.add('on');
    document.body.style.overflow = 'hidden';
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
// ============================================
function addToCartFromModal() {
    if (!IS_AUTHENTICATED) { window.location.href = URLS.login; return; }
    if (!currentModalItem) return;
    const qty = parseInt(document.getElementById('mqty').value) || 1;

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
    .catch(() => showToast('Network error. Please try again.', 'error'));
}

// ============================================
// BUY NOW — POST form data to /create-buynow-payment/
// (backend uses request.POST not request.body JSON)
// ============================================
function buyNowFromModal() {
    if (!IS_AUTHENTICATED) { window.location.href = URLS.login; return; }
    if (!currentModalItem) return;
    const qty = parseInt(document.getElementById('mqty').value) || 1;

    const formData = new FormData();
    formData.append('menu_item_id', currentModalItem.id);
    formData.append('quantity', qty);
    formData.append('csrfmiddlewaretoken', getCsrf());

    fetch(URLS.createBuyNow, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf() },
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.success && data.checkout_url) {
            window.location.href = data.checkout_url;
        } else if (data.success && data.redirect_url) {
            window.location.href = data.redirect_url;
        } else {
            showToast(data.message || data.error || 'Could not process Buy Now.', 'error');
        }
    })
    .catch(() => showToast('Network error. Please try again.', 'error'));
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

// ============================================
// SEARCH — live dropdown using /api/search-menu/
// ============================================
function initSearch() {
    const inp = document.getElementById('hSearch');
    const clr = document.getElementById('hClr');
    const drop = document.getElementById('searchDropdown');
    if (!inp) return;

    let timer;

    inp.addEventListener('input', function () {
        clr.classList.toggle('on', this.value.length > 0);
        clearTimeout(timer);
        const q = this.value.trim();
        if (q.length < 2) { drop.classList.remove('active'); return; }
        timer = setTimeout(() => performSearch(q), 280);
    });

    clr.addEventListener('click', function () {
        inp.value = '';
        this.classList.remove('on');
        drop.classList.remove('active');
        // Re-show all est cards
        document.querySelectorAll('.food-est-item').forEach(el => el.style.display = '');
    });
}

function performSearch(q) {
    const drop = document.getElementById('searchDropdown');
    const content = document.getElementById('searchDropdownContent');

    // Filter establishment cards in DOM
    document.querySelectorAll('.food-est-item').forEach(el => {
        const name = (el.dataset.name || '').toLowerCase();
        const cat = (el.dataset.category || '').toLowerCase();
        el.style.display = (name.includes(q.toLowerCase()) || cat.includes(q.toLowerCase())) ? '' : 'none';
    });

    // Hit search API — returns { success, menus: [...], establishments: [...] }
    fetch(`${URLS.searchMenu}?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
            let html = '';
            // Backend returns key 'menus' with nested 'establishment' object
            const items = data.menus || [];
            const ests = data.establishments || [];

            if (items.length > 0) {
                html += `<div class="search-dropdown-section"><div class="search-dropdown-title"><i class="fas fa-hamburger"></i> Menu Items</div>`;
                items.slice(0, 6).forEach(item => {
                    const estId = item.establishment ? item.establishment.id : '';
                    const estName = item.establishment ? item.establishment.name : '';
                    html += `<div class="search-dropdown-item" onclick="window.location.href='${URLS.estDetail}${estId}/'">
                        <div class="search-dropdown-item-icon"><i class="fas fa-utensils"></i></div>
                        <div>
                            <div class="search-dropdown-item-name">${highlightMatch(escHtml(item.name), q)}</div>
                            <div class="search-dropdown-item-meta">
                                <span>₱${parseFloat(item.price).toFixed(2)}</span>
                                <span>•</span>
                                <span>${escHtml(estName)}</span>
                            </div>
                        </div>
                    </div>`;
                });
                html += '</div>';
            }

            if (ests.length > 0) {
                html += `<div class="search-dropdown-section"><div class="search-dropdown-title"><i class="fas fa-store"></i> Establishments</div>`;
                ests.slice(0, 4).forEach(est => {
                    const stColor = est.status === 'Open' ? '#10b981' : '#ef4444';
                    html += `<div class="search-dropdown-item" onclick="window.location.href='${URLS.estDetail}${est.id}/'">
                        <div class="search-dropdown-item-icon"><i class="fas fa-store"></i></div>
                        <div>
                            <div class="search-dropdown-item-name">${highlightMatch(escHtml(est.name), q)}</div>
                            <div class="search-dropdown-item-meta">
                                <span style="color:${stColor}">${est.status}</span>
                                <span>•</span>
                                <span>${escHtml(est.category)}</span>
                            </div>
                        </div>
                    </div>`;
                });
                html += '</div>';
            }

            if (html) {
                content.innerHTML = html;
                drop.classList.add('active');
            } else {
                content.innerHTML = `<div class="search-no-results"><i class="fas fa-search"></i> No results for "${escHtml(q)}"</div>`;
                drop.classList.add('active');
            }
        })
        .catch(() => drop.classList.remove('active'));
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
        const drop = document.getElementById('searchDropdown');
        if (drop) drop.classList.remove('active');
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