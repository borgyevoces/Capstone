// ============================================
// KabsuEats.js — All functions connected to Django backend
// ✅ UPDATED: Real-time polling for bestsellers AND establishment cards
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
let currentModalInRequest = 0;   // qty already in a pending order for the modal item
let currentModalInCart    = 0;   // qty already in PENDING cart for the modal item

// ── SEARCH STATE ──
let searchDebounceTimer = null;
let currentSearchQuery = '';
let searchMode = null; // null | 'menu' | 'establishment' | 'category'
let searchMenuData = []; // results from search_menu_items API
let searchAbortController = null; // AbortController for in-flight fetch
let searchToken = 0; // increment each search to discard stale responses

// ── CSRF Helper ──
function getCsrf() {
    return document.getElementById('csrfToken')?.value || '';
}


// ── Status Real-time Refresh Timers ──
let statusRefreshTimer    = null;
let estStatusRefreshTimer = null;
let cartRefreshTimer      = null;

// ✅ last_modified trackers — detect dashboard changes for instant client sync
let bsLastModified  = {};  // { establishment_id: timestamp } for bestsellers
let estLastModified = {};  // { establishment_id: timestamp } for card statuses

// ============================================
// INIT ON DOM READY
// ============================================
// ── INVENTORY WebSocket STATE ──
// Keyed by establishment_id → WebSocket instance
// Populated after bestsellers load (we know which establishments to watch)
const inventoryWs = {};

document.addEventListener('DOMContentLoaded', function () {
    initProfile();
    initScrollTop();
    fetchBestsellers();
    autoHideMessages();
    initEstablishmentCards();
    initSmartSearch();

    // ✅ Load correct cart count on every page load (realtime from backend)
    updateCartBadge();

    // ✅ Cart badge real-time polling every 10 seconds
    cartRefreshTimer = setInterval(updateCartBadge, 3000);

    // ✅ Bestseller status refresh every 30 seconds
    statusRefreshTimer = setInterval(refreshBestsellerStatuses, 30000);

    // ✅ Establishment card status/rating refresh every 30 seconds (backend)
    estStatusRefreshTimer = setInterval(refreshEstablishmentCardStatuses, 30000);

    // ✅ Pause polling when tab hidden, resume when visible
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            clearInterval(statusRefreshTimer);
            clearInterval(estStatusRefreshTimer);
            clearInterval(cartRefreshTimer);
        } else {
            refreshBestsellerStatuses();
            refreshEstablishmentCardStatuses();
            updateCartBadge();
            statusRefreshTimer    = setInterval(refreshBestsellerStatuses, 30000);
            estStatusRefreshTimer = setInterval(refreshEstablishmentCardStatuses, 30000);
            cartRefreshTimer      = setInterval(updateCartBadge, 3000);
        }
    });
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
// ✅ REALTIME INVENTORY — WebSocket per establishment
// When any user places an order, the server broadcasts the new
// menu item quantities instantly to ALL connected browsers.
// This function subscribes to one establishment's channel.
// ============================================
function subscribeInventoryWs(estId) {
    if (inventoryWs[estId]) return; // already connected, don't duplicate

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/inventory/${estId}/`);

    ws.onopen = function () {
        console.log(`📦 [Inventory WS] Connected → establishment #${estId}`);
    };

    ws.onmessage = function (e) {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'quantity_update') {
                applyInventoryUpdate(data.updates);
            }
        } catch (err) {
            console.warn('[Inventory WS] Bad message:', err);
        }
    };

    ws.onclose = function () {
        delete inventoryWs[estId];
        console.log(`📦 [Inventory WS] Disconnected from #${estId} — will reconnect in 3s`);
        // Auto-reconnect so users never miss an update during a session
        setTimeout(() => subscribeInventoryWs(estId), 3000);
    };

    ws.onerror = function () {
        ws.close(); // triggers onclose → reconnect
    };

    inventoryWs[estId] = ws;
}

// ─────────────────────────────────────────────────────────────
// Apply a batch of quantity updates from the WebSocket message.
// updates = [ { menu_item_id, new_quantity }, ... ]
// ─────────────────────────────────────────────────────────────
function applyInventoryUpdate(updates) {
    if (!Array.isArray(updates) || !updates.length) return;

    let needsRerender = false;

    updates.forEach(({ menu_item_id, new_quantity }) => {
        const newQty = parseInt(new_quantity, 10);

        // ── 1. Update bsData in-memory ──────────────────────────────
        const bsIdx = bsData.findIndex(x => x.id === menu_item_id);
        if (bsIdx !== -1) {
            const wasInStock = bsData[bsIdx].quantity > 0;
            bsData[bsIdx].quantity = newQty;
            // If item just went out of stock or came back in, re-render the carousel
            if ((wasInStock && newQty <= 0) || (!wasInStock && newQty > 0)) {
                needsRerender = true;
            }
        }

        // ── 2. Update searchMenuData in-memory ──────────────────────
        const smIdx = searchMenuData.findIndex(x => x.id === menu_item_id);
        if (smIdx !== -1) searchMenuData[smIdx].quantity = newQty;

        // ── 3. Update the rendered .bsc card instantly ───────────────
        const card = document.querySelector(`.bsc[onclick="openMod(${menu_item_id})"]`);
        if (card) {
            // Update "X left" stock span
            card.querySelectorAll('.bsc-stats span').forEach(span => {
                if (span.textContent.includes('left') || span.textContent.includes('left')) {
                    span.innerHTML = newQty <= 0
                        ? `<i class="fas fa-times-circle" style="color:#dc2626"></i> Out of Stock`
                        : `<i class="fas fa-boxes"></i> ${newQty} left`;
                }
            });
            // Dim card and block clicks if out of stock
            card.style.opacity       = newQty <= 0 ? '0.45' : '';
            card.style.pointerEvents = newQty <= 0 ? 'none' : '';
        }

        // ── 4. Update open bestseller/search modal in real-time ─────
        if (currentModalItem && currentModalItem.id === menu_item_id) {
            currentModalItem.quantity = newQty;

            // Update stock display text
            const mStock = document.getElementById('mStock');
            if (mStock) {
                mStock.innerHTML = newQty <= 0
                    ? `<i class="fas fa-times-circle"></i> Out of Stock`
                    : `<i class="fas fa-box"></i> ${newQty} Items`;
                mStock.style.transition = 'color 0.3s';
                mStock.style.color = newQty === 0 ? '#ef4444' : newQty <= 5 ? '#f59e0b' : '';
                setTimeout(() => { mStock.style.color = ''; }, 2000);
            }

            // Clamp the qty input so user can't select more than available
            const qtyInput = document.getElementById('mqty');
            if (qtyInput) {
                qtyInput.max = newQty;
                const curVal = parseInt(qtyInput.value, 10) || 1;
                if (curVal > newQty) qtyInput.value = Math.max(1, newQty);
            }

            // Re-evaluate Add to Cart / Buy Now button states
            const st = (currentModalItem.establishment && currentModalItem.establishment.status || 'closed').toLowerCase();
            applyModOrderState(st, newQty);

            // Toast notification for stock changes
            if (newQty === 0) {
                showToast('⚠️ Sorry, this item just sold out!', 'error');
            } else if (newQty <= 5) {
                showToast(`⚡ Only ${newQty} left — order fast!`, 'warning');
            }
        }
    });

    // ── 5. Re-render carousel if any item went in/out of stock ──────
    // Filter out-of-stock items from the bestsellers display
    if (needsRerender && !searchMode) {
        const inStockBs = bsData.filter(x => x.quantity > 0);
        renderBS(inStockBs.length > 0 ? inStockBs : bsData); // fallback: show all if all OOS
    }
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
                // ✅ Seed last_modified tracker on initial load
                bsData.forEach(item => {
                    const estId = item.establishment && item.establishment.id;
                    const ts    = item.establishment && item.establishment.last_modified || 0;
                    if (estId && ts) bsLastModified[estId] = ts;
                });
                // Only render if not in search mode
                if (!searchMode) renderBS(bsData);
                // ✅ REALTIME: Subscribe to inventory WebSocket for every establishment
                // shown so stock changes by other users reflect instantly — no refresh.
                const estIds = [...new Set(bsData.map(x => x.establishment && x.establishment.id).filter(Boolean))];
                estIds.forEach(id => subscribeInventoryWs(id));
            } else {
                const _ct = document.getElementById('cTrack');
                const _cp = document.getElementById('cPrev');
                const _cn = document.getElementById('cNext');
                if (_ct) _ct.innerHTML = '<div style="padding:40px;color:#9ca3af;font-size:14px;text-align:center;width:100%">No bestseller items at the moment. Check back soon!</div>';
                if (_cp) _cp.disabled = true;
                if (_cn) _cn.disabled = true;
            }
        })
        .catch(() => {
            const _ct = document.getElementById('cTrack');
            if (_ct) _ct.innerHTML = '<div style="padding:40px;color:#ef4444;font-size:14px;text-align:center;width:100%"><i class="fas fa-exclamation-circle"></i> Failed to load bestsellers.</div>';
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

            // ✅ Check if any establishment changed since last poll
            let changed = false;
            data.bestsellers.forEach(fresh => {
                const estId = fresh.establishment && fresh.establishment.id;
                const serverTs = fresh.establishment && fresh.establishment.last_modified || 0;
                if (estId && serverTs && bsLastModified[estId] !== undefined && serverTs > bsLastModified[estId]) {
                    changed = true;
                }
                if (estId && serverTs) bsLastModified[estId] = serverTs;
            });

            // ✅ If dashboard changed, do a full bestseller re-fetch & re-render
            if (changed) {
                console.log('🔄 [KabsuEats] Dashboard change detected in bestsellers — re-fetching');
                fetchBestsellers();
                return;
            }

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
                    // ✅ Re-apply order button state in case establishment just opened/closed
                    applyModOrderState(st, currentModalItem.quantity);
                }
            }
        })
        .catch(() => {});
}

// ============================================
// ✅ NEW: REFRESH ESTABLISHMENT CARD STATUSES (backend)
// Polls /api/establishments/status/ every 30s and updates
// status badge, rating number, stars, and review count on
// every establishment card without a page reload.
// ============================================
function refreshEstablishmentCardStatuses() {
    const apiUrl = (typeof URLS !== 'undefined' && URLS.allEstStatus)
        ? URLS.allEstStatus
        : '/api/establishments/status/';

    fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
            if (!data.success || !data.establishments) return;

            // ✅ Check if any establishment changed since last poll
            let changed = false;
            data.establishments.forEach(function (est) {
                const serverTs = est.last_modified || 0;
                if (serverTs && estLastModified[est.id] !== undefined && serverTs > estLastModified[est.id]) {
                    changed = true;
                }
                if (serverTs) estLastModified[est.id] = serverTs;
            });

            data.establishments.forEach(function (est) {
                const status   = (est.status || 'closed').toLowerCase();
                const isOpen   = status === 'open';
                const labelTxt = isOpen ? 'Open' : 'Closed';

                // ── Card root element (targeted by data-id) ──
                const card = document.querySelector(`.food-est-item[data-id="${est.id}"]`);

                // ── 1. Status badge ──
                const statusBadge = document.getElementById(`estStatusBadge-${est.id}`);
                if (statusBadge) {
                    const dot = statusBadge.querySelector('.estb-dot');
                    statusBadge.className = `estb ${status}`;
                    statusBadge.innerHTML = '';
                    if (dot) statusBadge.appendChild(dot);
                    statusBadge.appendChild(document.createTextNode(labelTxt));
                    if (card) card.setAttribute('data-status', status);
                }

                // ── 2. Rating number ──
                if (est.average_rating !== undefined) {
                    const rNum = document.getElementById(`estRatingNum-${est.id}`);
                    if (rNum) rNum.textContent = parseFloat(est.average_rating).toFixed(1);

                    // ── 3. Stars ──
                    const starsWrap = document.getElementById(`estStars-${est.id}`);
                    if (starsWrap) {
                        const svSpan = starsWrap.querySelector('.sv');
                        const rounded = Math.round(est.average_rating);
                        starsWrap.querySelectorAll('i').forEach(el => el.remove());
                        const starHTML = [1,2,3,4,5].map(i =>
                            i <= rounded
                                ? '<i class="fas fa-star" style="color:#fbbf24;font-size:12px"></i>'
                                : '<i class="far fa-star" style="color:#fbbf24;font-size:12px"></i>'
                        ).join('');
                        starsWrap.insertAdjacentHTML('afterbegin', starHTML);
                        if (svSpan && !starsWrap.contains(svSpan)) starsWrap.appendChild(svSpan);
                    }
                }

                // ── 4. Review count ──
                if (est.review_count !== undefined) {
                    const rc = document.getElementById(`estReviewCount-${est.id}`);
                    if (rc) rc.textContent = `(${est.review_count} Reviews)`;
                }

                // ── 5–9. Detail fields — only update if changed ──────────
                if (changed && card) {
                    // 5. Name
                    if (est.name) {
                        const nameEl = card.querySelector('.estc-name');
                        if (nameEl) nameEl.textContent = est.name;
                        card.setAttribute('data-name', est.name.toLowerCase());
                        // Update img alt
                        const img = card.querySelector('.estc-img');
                        if (img) img.alt = est.name;
                    }

                    // 6. Image
                    if (est.image_url) {
                        const img = card.querySelector('.estc-img');
                        if (img && img.src !== est.image_url) img.src = est.image_url;
                    }

                    // 7. Categories
                    if (est.categories) {
                        const catEl = card.querySelector('.ecat');
                        if (catEl) catEl.textContent = est.categories;
                        card.setAttribute('data-category', est.categories.toLowerCase());
                    }

                    // 8. Payment methods (2nd .emr div — after the distance one)
                    if (est.payment_methods !== undefined) {
                        const emrs = card.querySelectorAll('.emr');
                        // emrs[0] = distance, emrs[1] = payment, emrs[2] = amenities
                        if (emrs[1]) {
                            emrs[1].innerHTML = `<i class="fas fa-credit-card" style="color:#B71C1C"></i> ${est.payment_methods || 'Cash'}`;
                        }
                    }

                    // 9. Amenities (3rd .emr div)
                    if (est.amenities !== undefined) {
                        const emrs = card.querySelectorAll('.emr');
                        if (emrs[2]) {
                            if (est.amenities) {
                                emrs[2].innerHTML = `<i class="fas fa-concierge-bell" style="color:#B71C1C"></i> ${est.amenities}`;
                                emrs[2].style.display = '';
                            } else {
                                emrs[2].style.display = 'none';
                            }
                        }
                    }

                    // 10. Opening/closing time data-attrs (for client-side status calc)
                    if (est.opening_time) {
                        // Convert 12h to 24h for data-attrs used by status_updater
                        // The API now returns opening_time in 12h format for display
                        // We keep the data-attrs as-is since status_updater uses its own calc
                    }
                }
            });
        })
        .catch(() => {}); // silent — never break the page
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
        const imgSrc = d.image || 'https://placehold.co/300x300/f3f4f6/d1d5db?text=Food';
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
            <div class="bsc-img" style="position:relative;">
                <img src="${imgSrc}" alt="${escHtml(d.name)}" loading="lazy"
                     onerror="this.src='https://placehold.co/300x300/f3f4f6/d1d5db?text=Food'">
                ${badgeHtml}
                <button class="menu-fav-heart-btn bsc-fav-btn"
                        id="bscHeart-${d.id}"
                        data-menu-id="${d.id}"
                        data-menu-name="${escHtml(d.name)}"
                        data-menu-image="${d.image || ''}"
                        data-menu-price="${parseFloat(d.price).toFixed(2)}"
                        data-est-name="${escHtml(d.establishment.name)}"
                        data-est-id="${d.establishment.id}"
                        data-est-url="/food_establishment/${d.establishment.id}/"
                        title="Save to Favorites"
                        onclick="event.stopPropagation(); toggleFavMenu(this)">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div class="bsc-body">
                <div class="bsc-name">${escHtml(d.name)}</div>
                ${d.description ? `<div class="bsc-desc">${escHtml(d.description)}</div>` : ''}
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
                <div style="margin-top:auto;">
                    <button class="bsc-btn" style="width:100%;" onclick="event.stopPropagation();openMod(${d.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    cidx = 0;
    updCar();
    updNav();
    // Sync heart button states to localStorage
    setTimeout(_syncFavMenuButtons, 60);
}

// ── Carousel helpers ──
function cardW() {
    const cards = document.querySelectorAll('.bsc');
    if (cards.length < 2) {
        const c = cards[0];
        return c ? c.offsetWidth + parseInt(getComputedStyle(document.getElementById('cTrack')).gap || 20) : 238;
    }
    // Measure actual distance between two cards (offsetLeft difference)
    return cards[1].offsetLeft - cards[0].offsetLeft;
}
function maxIdx() {
    const track = document.getElementById('cTrack');
    const cont = document.querySelector('.car-cont');
    const cards = track ? track.querySelectorAll('.bsc') : [];
    const cardCount = cards.length || (bsData ? bsData.length : 0);
    if (!cont || !cards.length) return Math.max(0, cardCount - VISIBLE);
    const cw = cardW();
    const contWidth = cont.offsetWidth;
    // How many cards scroll positions before last card hits right edge
    const vis = Math.floor(contWidth / cw);
    return Math.max(0, cardCount - vis);
}

function cScroll(d) {
    if (isGrid) return;
    cidx = Math.max(0, Math.min(cidx + d, maxIdx()));
    updCar(); updNav();
}
function updCar() {
    if (isGrid) return;
    const track = document.getElementById('cTrack');
    const cont = document.querySelector('.car-cont');
    if (!track || !cont) return;

    const cards = track.querySelectorAll('.bsc');
    const totalCards = cards.length;
    if (!totalCards) return;

    const cw = cardW();
    const contWidth = cont.offsetWidth;
    const totalWidth = cards[totalCards - 1].offsetLeft + cards[totalCards - 1].offsetWidth - cards[0].offsetLeft;
    const maxScroll = Math.max(0, totalWidth - contWidth);
    const scroll = Math.min(cidx * cw, maxScroll);

    track.style.transform = `translateX(-${scroll}px)`;
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
// VIEW SWITCHER — stubs (map is now its own page)
// ============================================
function toggleDD() {}
function closeDD()  {}
function setView(v) {}


// ============================================
// LEAFLET MAP
// ============================================
const TILES = {
    hybrid:    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                 opt: { attribution: 'Tiles &copy; Esri', maxZoom: 20 },
                 labels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png' },
    street:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                 opt: { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 } },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                 opt: { attribution: 'Tiles &copy; Esri', maxZoom: 20 } },
    terrain:   { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                 opt: { attribution: '&copy; OpenTopoMap', maxZoom: 17 } }
};

let mapPollTimer = null, curLabels = null;
let liveStatusCache = {};
let userLocMarker = null;
let userLatLng = null;       // stores the user's current location {lat, lng}
let routeLine = null;        // active polyline from user → establishment
let routeAnimMarker = null;  // animated dot along the route
let activeRouteEstId = null; // ✅ tracks which establishment the current route is for
let mapFilterState = { status: '', alpha: '', dist: '', rating: '', cat: '', search: '' };

function initMap() {
    setTimeout(() => {
        mapInst = L.map('esMap', { center: [CVSU.lat, CVSU.lng], zoom: 16, zoomControl: true, scrollWheelZoom: true });
        curTile = L.tileLayer(TILES.hybrid.url, TILES.hybrid.opt).addTo(mapInst);
        curLabels = L.tileLayer(TILES.hybrid.labels, { attribution: '', maxZoom: 20, subdomains: 'abcd', opacity: 1 }).addTo(mapInst);

        L.circle([CVSU.lat, CVSU.lng], {
            color: '#FFC107', fillColor: 'transparent',
            fillOpacity: 0, weight: 3, radius: RADIUS, dashArray: '10 8'
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
    // ✅ Clear any existing route — only 1 route at a time, and never for a filtered-out establishment
    const activeStillVisible = data.some(e => e.id === activeRouteEstId);
    if (!activeStillVisible) clearRoute();
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
            '<div style="display:flex;gap:6px;margin-top:10px;">' +
            '<button onclick="window.location.href=\'' + URLS.estDetail + e.id + '/\'" ' +
            'style="flex:1;padding:9px;background:linear-gradient(135deg,#B71C1C,#8B0000);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;">' +
            '<i class="fas fa-eye"></i> View</button>' +
            '<button onclick="showRouteToEst(' + parseFloat(e.latitude) + ',' + parseFloat(e.longitude) + ',\'' + escHtml(e.name).replace(/'/g, "\\'") + '\',' + e.id + ')" ' +
            'style="flex:1;padding:9px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;">' +
            '<i class="fas fa-directions"></i> Directions</button>' +
            '</div></div>';

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
    if (curTile)   mapInst.removeLayer(curTile);
    if (curLabels) { mapInst.removeLayer(curLabels); curLabels = null; }
    curTile = L.tileLayer(TILES[t].url, TILES[t].opt).addTo(mapInst);
    if (TILES[t].labels) {
        curLabels = L.tileLayer(TILES[t].labels, { attribution: '', maxZoom: 20, subdomains: 'abcd', opacity: 1 }).addTo(mapInst);
    }
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
            userLatLng = { lat, lng };
            if (userLocMarker) mapInst.removeLayer(userLocMarker);
            const locIco = L.divIcon({
                html: '<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.3),0 2px 8px rgba(0,0,0,.3);"></div>',
                className: '', iconSize: [18, 18], iconAnchor: [9, 9]
            });
            userLocMarker = L.marker([lat, lng], { icon: locIco }).addTo(mapInst)
                .bindPopup('<div style="font-family:Poppins,sans-serif;font-weight:600;font-size:13px;">📍 You are here</div>')
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
// ROUTING — Real road-based routing via OSRM
// ============================================

// OSRM turn instruction codes → human-readable + emoji
const OSRM_TURN_MAP = {
    'turn-straight':        { emoji: '⬆️',  text: 'Continue straight' },
    'turn-slight right':    { emoji: '↗️',  text: 'Turn slight right' },
    'turn-right':           { emoji: '➡️',  text: 'Turn right' },
    'turn-sharp right':     { emoji: '↪️',  text: 'Turn sharp right' },
    'turn-uturn':           { emoji: '🔄',  text: 'Make a U-turn' },
    'turn-sharp left':      { emoji: '↩️',  text: 'Turn sharp left' },
    'turn-left':            { emoji: '⬅️',  text: 'Turn left' },
    'turn-slight left':     { emoji: '↖️',  text: 'Turn slight left' },
    'depart':               { emoji: '📍',  text: 'Depart' },
    'arrive':               { emoji: '🏁',  text: 'Arrive' },
    'roundabout':           { emoji: '🔄',  text: 'Enter roundabout' },
    'merge':                { emoji: '↗️',  text: 'Merge' },
    'fork':                 { emoji: '⬆️',  text: 'Keep on fork' },
    'end of road-right':    { emoji: '➡️',  text: 'End of road, turn right' },
    'end of road-left':     { emoji: '⬅️',  text: 'End of road, turn left' },
    'new name-straight':    { emoji: '⬆️',  text: 'Continue on' },
    'new name-right':       { emoji: '➡️',  text: 'Continue right on' },
    'new name-left':        { emoji: '⬅️',  text: 'Continue left on' },
    'notification':         { emoji: 'ℹ️',  text: 'Note' },
    'rotary':               { emoji: '🔄',  text: 'Enter rotary' },
    'roundabout turn':      { emoji: '🔄',  text: 'Roundabout turn' },
    'exit roundabout':      { emoji: '↗️',  text: 'Exit roundabout' },
    'exit rotary':          { emoji: '↗️',  text: 'Exit rotary' },
};

function getOsrmInstruction(step) {
    const maneuver = step.maneuver || {};
    const type = maneuver.type || '';
    const modifier = maneuver.modifier || '';
    const key = modifier ? `${type}-${modifier}` : type;
    const match = OSRM_TURN_MAP[key] || OSRM_TURN_MAP[type] || { emoji: '➡️', text: cap(type || 'Continue') };
    const road = step.name ? ` on <strong>${escHtml(step.name)}</strong>` : '';
    const dist = step.distance > 0 ? ` for <strong>${formatDist(step.distance)}</strong>` : '';
    return { emoji: match.emoji, text: match.text + road + dist };
}

function formatDist(meters) {
    return meters < 1000 ? Math.round(meters) + 'm' : (meters / 1000).toFixed(1) + 'km';
}

function formatDuration(seconds) {
    if (seconds < 60) return Math.round(seconds) + 's';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return mins + ' min';
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return hrs + 'h ' + (rem > 0 ? rem + 'm' : '');
}

async function showRouteToEst(destLat, destLng, estName, estId) {
    if (!userLatLng) {
        showToast('Please tap "Show My Location" first!', 'error');
        return;
    }

    clearRoute();
    activeRouteEstId = estId || null; // ✅ track which establishment this route belongs to
    _rgShow(estName, null, null, null, null); // loading state

    const fromLng = userLatLng.lng, fromLat = userLatLng.lat;
    const OSRM_URL =
        'https://router.project-osrm.org/route/v1/walking/' +
        fromLng + ',' + fromLat + ';' +
        destLng + ',' + destLat +
        '?overview=full&geometries=geojson&steps=true&annotations=false';

    try {
        const res  = await fetch(OSRM_URL);
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes || !data.routes.length) throw new Error('No route');

        const route  = data.routes[0];
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);

        // Single clean Google-Maps-style line
        routeLine = L.polyline(coords, {
            color: '#1a73e8',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(mapInst);
        routeLine._extraLayers = [];

        // Small animated dot
        const totalPts = coords.length;
        let animStep = 0;
        function animDot() {
            if (!routeLine) return;
            const pos = coords[animStep % totalPts];
            if (routeAnimMarker) {
                routeAnimMarker.setLatLng(pos);
            } else {
                const ico = L.divIcon({
                    html: '<div style="width:10px;height:10px;background:#1a73e8;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>',
                    className: '', iconSize: [10, 10], iconAnchor: [5, 5]
                });
                routeAnimMarker = L.marker(pos, { icon: ico, zIndexOffset: 1000 }).addTo(mapInst);
            }
            animStep++;
            if (routeLine) setTimeout(animDot, Math.max(30, 2000 / totalPts));
        }
        animDot();

        mapInst.fitBounds(L.latLngBounds(coords), { padding: [60, 60], animate: true, duration: 1.0 });

        const steps = [];
        (route.legs || []).forEach(leg => (leg.steps || []).forEach(s => steps.push(s)));

        _rgShow(estName, formatDist(route.distance), formatDuration(route.duration), steps, route.distance);

    } catch (err) {
        clearRoute();
        const from = [userLatLng.lat, userLatLng.lng];
        const to   = [destLat, destLng];
        routeLine = L.polyline([from, to], {
            color: '#1a73e8', weight: 5, opacity: 0.9,
            lineJoin: 'round', lineCap: 'round', dashArray: '8 6'
        }).addTo(mapInst);
        routeLine._extraLayers = [];
        mapInst.fitBounds(L.latLngBounds([from, to]), { padding: [60, 60] });
        const dist = haversineMeters(userLatLng.lat, userLatLng.lng, destLat, destLng);
        _rgShow(estName, formatDist(dist), '~' + formatDuration(dist / 1.2), null, dist);
    }
}

// Populate the white #routeGuide panel in the HTML
function _rgShow(destName, dist, duration, rawSteps, rawMeters) {
    const guide    = document.getElementById('routeGuide');
    const loading  = document.getElementById('rgLoading');
    const summary  = document.getElementById('rgSummary');
    const footer   = document.getElementById('rgFooter');
    const stepsEl  = document.getElementById('rgSteps');
    const destEl   = document.getElementById('rgDestName');
    const subtitle = document.getElementById('rgSubtitle');
    const distEl   = document.getElementById('rgDist');
    const timeEl   = document.getElementById('rgTime');
    const btn      = document.getElementById('mapRouteBtn');
    if (!guide) return;

    if (destEl)  destEl.textContent = destName;

    if (!dist) {
        // Loading state
        if (subtitle) subtitle.textContent = 'Calculating\u2026';
        if (summary)  summary.style.display = 'none';
        if (footer)   footer.style.display  = 'none';
        if (stepsEl)  stepsEl.innerHTML = '';
        if (loading)  loading.style.display = 'flex';
        guide.classList.add('show');
        if (btn) { btn.style.display = 'flex'; btn.classList.add('active'); }
        return;
    }

    if (subtitle) subtitle.textContent = 'Walking directions';
    if (distEl)   distEl.textContent   = dist;
    if (timeEl)   timeEl.textContent   = duration;
    if (summary)  summary.style.display = 'flex';
    if (loading)  loading.style.display = 'none';

    if (stepsEl) {
        stepsEl.innerHTML = '';
        if (rawSteps && rawSteps.length) {
            rawSteps.forEach(function(step, idx) {
                const type     = (step.maneuver || {}).type     || '';
                const modifier = (step.maneuver || {}).modifier || '';
                const name     = step.name || '';
                const d        = step.distance || 0;
                const dLbl     = d < 5 ? '' : d < 1000 ? Math.round(d) + 'm' : (d / 1000).toFixed(1) + 'km';
                const isLast   = idx === rawSteps.length - 1;

                let icoClass = '', icoHtml = '<i class="fas fa-arrow-up"></i>';
                if (type === 'depart')                            { icoClass = 'depart'; icoHtml = '<i class="fas fa-walking"></i>'; }
                else if (type === 'arrive')                       { icoClass = 'arrive'; icoHtml = '<i class="fas fa-map-marker-alt"></i>'; }
                else if (modifier && modifier.includes('left'))   { icoClass = 'left';   icoHtml = '<i class="fas fa-arrow-left"></i>'; }
                else if (modifier && modifier.includes('right'))  { icoClass = 'right';  icoHtml = '<i class="fas fa-arrow-right"></i>'; }
                else if (modifier === 'uturn')                    { icoClass = 'uturn';  icoHtml = '<i class="fas fa-undo-alt"></i>'; }

                let label = '';
                if (type === 'depart')          label = 'Head ' + (modifier || 'forward') + (name ? ' on ' + name : '');
                else if (type === 'arrive')     label = 'Arrive at ' + (name || destName);
                else if (type === 'turn')       label = 'Turn ' + modifier + (name ? ' onto ' + name : '');
                else if (type === 'new name')   label = 'Continue onto ' + name;
                else if (type === 'continue')   label = 'Continue' + (name ? ' on ' + name : '');
                else if (type === 'roundabout') label = 'Enter roundabout' + (name ? ' \u2014 ' + name : '');
                else label = (cap(type) || 'Go') + (modifier ? ' ' + modifier : '') + (name ? ' on ' + name : '');

                const div = document.createElement('div');
                div.className = 'rg-step' + (isLast ? ' rg-step-last' : '');
                div.innerHTML =
                    '<div class="rg-ico ' + icoClass + '">' + icoHtml + '</div>' +
                    '<div class="rg-step-body">' +
                        '<div class="rg-step-name">' + escHtml(label) + '</div>' +
                        (dLbl ? '<div class="rg-step-dist">' + dLbl + '</div>' : '') +
                    '</div>';
                stepsEl.appendChild(div);
            });
        } else {
            stepsEl.innerHTML =
                '<div class="rg-step rg-step-last">' +
                '<div class="rg-ico depart"><i class="fas fa-walking"></i></div>' +
                '<div class="rg-step-body"><div class="rg-step-name">Head towards ' + escHtml(destName) + '</div>' +
                '<div class="rg-step-dist">Straight-line estimate</div></div></div>';
        }
    }

    if (footer) footer.style.display = 'block';
    guide.classList.add('show');
    if (btn) { btn.style.display = 'flex'; btn.classList.add('active'); }
}

function clearRoute() {
    activeRouteEstId = null; // ✅ reset tracker
    if (routeLine) {
        if (routeLine._extraLayers) {
            routeLine._extraLayers.forEach(l => { try { mapInst.removeLayer(l); } catch(e){} });
        }
        try { mapInst.removeLayer(routeLine); } catch(e){}
        routeLine = null;
    }
    if (routeAnimMarker) {
        try { mapInst.removeLayer(routeAnimMarker); } catch(e){}
        routeAnimMarker = null;
    }
    const guide = document.getElementById('routeGuide');
    const btn   = document.getElementById('mapRouteBtn');
    if (guide) guide.classList.remove('show');
    if (btn)   btn.classList.remove('active');
}


function applyFilter() {
    const val = document.getElementById('catFilt').value.toLowerCase();
    document.querySelectorAll('.food-est-item').forEach(el => {
        const cat = (el.dataset.category || '').toLowerCase();
        const show = !val || cat.includes(val);
        const wrap = el.closest('.est-card-wrap') || el;
        wrap.style.display = show ? '' : 'none';
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

        // ALWAYS cancel pending debounce first
        clearTimeout(searchDebounceTimer);

        if (!q) {
            // Immediately reset — no delay, no debounce
            resetSearch();
            showAsdDefault();
            return;
        }

        // Show suggestions immediately (no debounce needed — purely local data)
        showAsdForQuery(q);

        // Debounce the actual page-level search (API call + DOM changes)
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
            } else if (q) {
                closeAsd();
                runSmartSearch(q);
            }
        } else if (e.key === 'Escape') {
            closeAsd();
        }
    });

    clr.addEventListener('click', function () {
        clearTimeout(searchDebounceTimer);
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

    // Recent searches from localStorage
    let recents = [];
    try { recents = JSON.parse(localStorage.getItem('kse_recent') || '[]'); } catch(e) {}

    if (recents.length > 0) {
        html += `<div class="asd-section">
            <div class="asd-section-title-row">
                <div class="asd-section-title"><i class="fas fa-history"></i> Recent Searches</div>
                <button class="asd-clear-all" onclick="clearAllRecents(event)">Clear all</button>
            </div>`;
        recents.slice(0, 5).forEach((r, idx) => {
            html += `<div class="asd-row" data-type="recent" data-val="${escHtml(r)}" onclick="pickAsd('${escHtml(r)}','recent')">
                <div class="asd-ico hist"><i class="fas fa-history"></i></div>
                <div class="asd-text"><div class="asd-name">${escHtml(r)}</div></div>
                <button class="asd-del" title="Remove" onclick="deleteRecent(event,${idx})" tabindex="-1"><i class="fas fa-times"></i></button>
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
    positionAsd();
    asd.classList.add('open');
    const hints = document.getElementById('hsHints');
    if (hints) hints.style.opacity = '0';
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
    positionAsd();
    asd.classList.add('open');
    document.getElementById('hsHints') && (document.getElementById('hsHints').style.opacity = '0');
    rebuildAsdRows();
}

// ── Delete a single recent search ──
function deleteRecent(e, idx) {
    e.stopPropagation();
    e.preventDefault();
    try {
        let recents = JSON.parse(localStorage.getItem('kse_recent') || '[]');
        recents.splice(idx, 1);
        localStorage.setItem('kse_recent', JSON.stringify(recents));
    } catch(err) {}
    // Re-render the dropdown
    const inp = document.getElementById('hSearch');
    if (inp && !inp.value.trim()) showAsdDefault();
}

// ── Clear all recent searches ──
function clearAllRecents(e) {
    e.stopPropagation();
    e.preventDefault();
    try { localStorage.setItem('kse_recent', '[]'); } catch(err) {}
    const inp = document.getElementById('hSearch');
    if (inp && !inp.value.trim()) showAsdDefault();
}

function rebuildAsdRows() {
    asdRows = Array.from(document.querySelectorAll('#asd .asd-row'));
    asdFocusIdx = -1;
}

// ── Position the fixed ASD dropdown below the search bar ──
function positionAsd() {
    const cont = document.getElementById('hsContEl');
    const asd  = document.getElementById('asd');
    if (!cont || !asd) return;
    const rect = cont.getBoundingClientRect();
    asd.style.top    = (rect.bottom + 6) + 'px';
    asd.style.left   = rect.left + 'px';
    asd.style.width  = rect.width + 'px';
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
    closeAsd(); // always close the suggestion dropdown when the actual search runs
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
        const wrap = el.closest('.est-card-wrap') || el;
        wrap.style.display = isMatch ? '' : 'none';
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
        const wrap = el.closest('.est-card-wrap') || el;
        wrap.style.display = isMatch ? '' : 'none';
        if (isMatch) { hasVisible = true; removeMatchBadge(el); }
    });

    if (!hasVisible) showNoEstMsg('No establishments found for "' + currentSearchQuery + '"');
    else clearNoEstMsg();
}

// ── MENU SEARCH ──
function doMenuSearch(q) {
    const qLow = q.toLowerCase();
    const myToken = ++searchToken;

    // Abort any in-flight request
    if (searchAbortController) { searchAbortController.abort(); }
    searchAbortController = new AbortController();

    // Show bestsellers section (with menu results)
    showBsSection();

    // Show loading in carousel
    const _ctrack = document.getElementById('cTrack');
    if (_ctrack) _ctrack.innerHTML = '<div class="sk-card"><div class="sk sk-img"></div><div class="sk sk-ln" style="margin-top:13px"></div><div class="sk sk-ln s"></div><div class="sk sk-bt"></div></div>'.repeat(5);

    // Update BS title
    const bsTitle = document.getElementById('bsTitle');
    if (bsTitle) bsTitle.innerHTML = `<i class="fas fa-search"></i> Menu results for "${escHtml(q)}"`;

    // Fetch menu items
    fetch(`${URLS.searchMenu}?q=${encodeURIComponent(q)}`, { signal: searchAbortController.signal })
        .then(r => r.json())
        .then(data => {
            // Discard if a newer search has started or user cleared search
            if (myToken !== searchToken || !searchMode) return;
            if (!data.success) return;
            searchMenuData = data.items;
            renderBS(searchMenuData, true);

            const matchingEstIds = new Set(searchMenuData.map(i => i.establishment.id));
            const matchCount = {};
            searchMenuData.forEach(i => {
                matchCount[i.establishment.id] = (matchCount[i.establishment.id] || 0) + 1;
            });
            sortEstablishmentsWithMatches(matchingEstIds, matchCount, qLow);

            // ✅ Subscribe to inventory WS for every establishment in search results
            [...matchingEstIds].forEach(id => subscribeInventoryWs(id));
        })
        .catch(err => {
            if (err.name === 'AbortError') return; // Intentionally cancelled — do nothing
            if (myToken !== searchToken || !searchMode) return;
            // Fallback: filter bsData by name
            const filtered = bsData.filter(d => d.name.toLowerCase().includes(qLow));
            renderBS(filtered, true);
            if (filtered.length === 0) {
                const _ctrk2 = document.getElementById('cTrack');
                if (_ctrk2) _ctrk2.innerHTML = `<div style="padding:40px;color:#9ca3af;font-size:14px;text-align:center;width:100%">No menu items found for "${escHtml(q)}"</div>`;
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

    // Show all cards (show the wrap)
    cards.forEach(c => {
        const wrap = c.closest('.est-card-wrap') || c;
        wrap.style.display = '';
    });

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
        const wrap = card.closest('.est-card-wrap') || card;
        grid.appendChild(wrap);
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
    // 1. Cancel any pending debounce
    clearTimeout(searchDebounceTimer);

    // 2. Cancel any in-flight fetch
    searchToken++;
    if (searchAbortController) { searchAbortController.abort(); searchAbortController = null; }

    const prevMode = searchMode;
    currentSearchQuery = '';
    searchMode = null;
    searchMenuData = [];

    // 3. Always restore BS section + carousel
    const bsSec = document.getElementById('bsSec');
    if (bsSec) bsSec.style.display = '';

    const cw = document.getElementById('carouselWrap');
    if (cw && curView === 'bs') cw.style.display = '';

    // 4. Restore BS title
    const bsTitle = document.getElementById('bsTitle');
    if (bsTitle) bsTitle.innerHTML = '<i class="fas fa-fire"></i> Top-rated items from all our partner establishments';

    // 5. Re-render bestsellers (always — covers all modes)
    if (bsData.length > 0) {
        renderBS(bsData, false);
    } else {
        fetchBestsellers();
    }

    // 6. Restore establishment grid — show all, remove badges, restore order
    const grid = document.getElementById('estGrid');
    if (grid) {
        grid.querySelectorAll('.food-est-item').forEach(card => {
            removeMatchBadge(card);
            const wrap = card.closest('.est-card-wrap') || card;
            wrap.style.display = '';
        });
        if (grid._originalOrder && grid._originalOrder.length > 0) {
            grid._originalOrder.forEach(c => {
                const wrap = c.closest('.est-card-wrap') || c;
                grid.appendChild(wrap);
            });
        }
    }

    // 7. Restore section title
    restoreSecTitle();

    // 8. Clear any "no results" messages
    clearNoEstMsg();

    // 9. Re-apply category filter if one was active
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
    currentModalInCart = 0;  // ✅ Reset immediately when switching items

    // ✅ Reset Add to Cart button IMMEDIATELY before async fetch
    const _addBtnReset = document.getElementById('addToCartBtn');
    if (_addBtnReset) {
        _addBtnReset.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
        _addBtnReset.style.background = '';
        _addBtnReset.style.opacity = '1';
        _addBtnReset.disabled = false;
        _addBtnReset.onclick = function(e){ addToCartFromModal(); };
        _addBtnReset.title = '';
    }
    const _mqtyReset = document.getElementById('mqty');
    if (_mqtyReset) { _mqtyReset.value = 1; _mqtyReset.disabled = false; _mqtyReset.removeAttribute('max'); }

    const imgSrc = d.image || 'https://placehold.co/300x300/f3f4f6/d1d5db?text=Food';
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

    // ✅ Enable/disable order buttons based on establishment status and stock
    applyModOrderState(st, d.quantity);


    document.getElementById('bsMod').classList.add('on');
    document.body.style.overflow = 'hidden';

    // ── Reset request info banner ──────────────────────────────────
    const ksInfo     = document.getElementById('ksModalRequestInfo');
    const ksInfoText = document.getElementById('ksModalRequestInfoText');
    if (ksInfo) ksInfo.style.display = 'none';

    // ✅ FIX: Fetch fresh establishment status directly from allEstStatus API
    // (not from bestsellers — that only covers bestseller items, not all menu items)
    const estId = d.establishment && d.establishment.id;
    if (estId) {
        const statusUrl = (typeof URLS !== 'undefined' && URLS.allEstStatus)
            ? URLS.allEstStatus : '/api/establishments/status/';
        fetch(statusUrl)
            .then(r => r.json())
            .then(data => {
                if (!data.success || !data.establishments) return;
                const freshEst = data.establishments.find(x => x.id === estId);
                if (!freshEst) return;
                const freshSt = (freshEst.status || 'closed').toLowerCase();
                // Update cached data
                if (currentModalItem && currentModalItem.establishment) {
                    currentModalItem.establishment.status = freshEst.status;
                }
                bsData.forEach(item => {
                    if (item.establishment && item.establishment.id === estId) {
                        item.establishment.status = freshEst.status;
                    }
                });
                // Update modal status badge
                const el = document.getElementById('mEstS');
                if (el) {
                    el.className = `mests ${freshSt}`;
                    el.innerHTML = `<i class="fas fa-circle" style="font-size:8px"></i> ${cap(freshSt)}`;
                }
                // Apply button state with accurate status
                applyModOrderState(freshSt, currentModalItem ? currentModalItem.quantity : 0);
            })
            .catch(() => {});
    }

    // ── Fetch PENDING cart qty for this item ──────────────────────
    if (IS_AUTHENTICATED && d.establishment && d.establishment.id) {
        const estId   = d.establishment.id;
        const itemKey = String(d.id);

        fetch(`/api/pending-cart-qtys/?establishment_id=${estId}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin'
        })
        .then(r => r.json())
        .catch(() => ({ success: false, qtys: {} }))
        .then(function(cartData) {
            const inCart  = (cartData.qtys || {})[itemKey] || 0;
            currentModalInCart = inCart;

            const qtyInput = document.getElementById('mqty');
            const addBtn   = document.getElementById('addToCartBtn');
            const maxStock = d.quantity;
            const remaining = Math.max(0, maxStock - inCart);

            // Never show the info banner — just silently adjust state
            if (remaining <= 0) {
                // Already at max — switch button to "Go to Cart"
                if (qtyInput) { qtyInput.value = 1; qtyInput.disabled = true; }
                if (addBtn) {
                    addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Go to Cart';
                    addBtn.style.background = '#dc2626';
                    addBtn.style.opacity = '1';
                    addBtn.disabled = false;
                    addBtn.onclick = function(e) { e.preventDefault(); window.location.href = '/cart/'; };
                }
            } else {
                // Still has room — cap qty input silently, keep button active
                if (qtyInput) {
                    qtyInput.max = remaining;
                    qtyInput.disabled = false;
                    if (parseInt(qtyInput.value) > remaining) qtyInput.value = 1;
                }
                // ✅ Ensure Add to Cart is properly restored (not stuck as "Go to Cart")
                if (addBtn) {
                    addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
                    addBtn.style.background = '';
                    addBtn.style.opacity = '1';
                    addBtn.disabled = false;
                    addBtn.onclick = function(e){ addToCartFromModal(); };
                    addBtn.title = '';
                }
            }
        });
    }
}

// ✅ Helper: enable/disable Add to Cart & Buy Now buttons in the bestseller modal
function applyModOrderState(status, quantity) {
    const addBtn = document.getElementById('addToCartBtn');
    const buyBtn = document.getElementById('buyNowBtn');
    const isOpen = status === 'open';
    const canOrder = isOpen && quantity > 0;

    [addBtn, buyBtn].forEach(btn => {
        if (!btn) return;
        btn.disabled = !canOrder;
        btn.style.opacity = canOrder ? '1' : '0.45';
        if (!canOrder) {
            btn.title = !isOpen
                ? 'This establishment is currently closed'
                : 'This item is out of stock';
        } else {
            btn.title = '';
        }
    });
}

function closeMod() {
    document.getElementById('bsMod').classList.remove('on');
    document.body.style.overflow = '';
    currentModalItem = null;
    currentModalInRequest = 0;
    const ksInfo = document.getElementById('ksModalRequestInfo');
    if (ksInfo) ksInfo.style.display = 'none';
    currentModalInCart = 0;

    // ✅ Reset qty input and Add to Cart button for next open
    const mqtyEl = document.getElementById('mqty');
    if (mqtyEl) { mqtyEl.value = 1; mqtyEl.disabled = false; mqtyEl.removeAttribute('max'); }
    const addBtn = document.getElementById('addToCartBtn');
    if (addBtn) {
        addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
        addBtn.style.background = '';
        addBtn.onclick = null;
    }
}

function chgQ(d) {
    const e = document.getElementById('mqty');
    const totalStock = currentModalItem ? currentModalItem.quantity : 99;
    // Cap by remaining slots: stock minus what's already in cart
    const effectiveMax = Math.max(0, totalStock - currentModalInCart);
    e.value = Math.max(1, Math.min(parseInt(e.value) + d, effectiveMax));
}

// ============================================
// ADD TO CART
// ============================================
function addToCartFromModal() {
    if (!IS_AUTHENTICATED) { window.location.href = URLS.login; return; }
    if (!currentModalItem) return;

    const mqtyEl   = document.getElementById('mqty');
    const btn      = document.getElementById('addToCartBtn');
    const maxStock = currentModalItem.quantity;

    // Already at max — go to cart
    if (!mqtyEl || parseInt(mqtyEl.value) <= 0 || mqtyEl.disabled) {
        window.location.href = '/cart/';
        return;
    }

    const qty = parseInt(mqtyEl.value) || 1;

    // ── Fire the request ──────────────────────────────────────────
    fetch(URLS.addToCart, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
        body: JSON.stringify({ menu_item_id: currentModalItem.id, quantity: qty })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // 1. Update badge
            if (typeof data.cart_count === 'number') {
                window.setCartBadgeCount(data.cart_count, true);
            } else {
                updateCartBadge(true);
            }

            // 2. Fly animation — modal stays OPEN
            _flyToCart();

            // 3. Update local running total
            currentModalInCart = (currentModalInCart || 0) + qty;
            const canAdd = Math.max(0, maxStock - currentModalInCart);

            if (canAdd <= 0) {
                // Cart is now full — switch button to "Go to Cart" only
                if (mqtyEl) { mqtyEl.value = 1; mqtyEl.disabled = true; }
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Go to Cart';
                    btn.style.background = '#dc2626';
                    btn.onclick = function(e) { e.preventDefault(); window.location.href = '/cart/'; };
                }
            } else {
                // Still has room — keep Add to Cart button active
                if (mqtyEl) { mqtyEl.max = canAdd; if (parseInt(mqtyEl.value) > canAdd) mqtyEl.value = 1; }
                // ✅ Make sure button is still "Add to Cart" and clickable
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
                    btn.style.background = '';
                    btn.style.opacity = '1';
                    btn.disabled = false;
                    btn.onclick = function(e){ addToCartFromModal(); };
                }
            }

        } else {
            showToast(data.message || 'Could not add to cart.', 'error');
        }
    })
    .catch(() => showToast('Network error. Please try again.', 'error'));
}

// ── Flying-to-cart animation ──
// imgEl: optional source element to fly from (defaults to #mImg)
function _flyToCart(imgEl) {
    // Find the cart icon in the sidebar
    const cartLink = document.querySelector('.client-sidebar .cart-link .csb-ico');
    if (!cartLink) return;

    // Get source image — use passed element or fall back to modal image
    const modalImg = imgEl || document.getElementById('mImg');
    const src = (modalImg && modalImg.src) ? modalImg.src : '';

    // Start position: centre of the source image element (if visible), else viewport centre
    let startX, startY;
    if (modalImg) {
        const r = modalImg.getBoundingClientRect();
        startX = r.left + r.width  / 2 - 26;
        startY = r.top  + r.height / 2 - 26;
    } else {
        startX = window.innerWidth  / 2 - 26;
        startY = window.innerHeight / 2 - 26;
    }

    // Create the flying element
    const fly = document.createElement('div');
    fly.style.cssText = [
        'position:fixed',
        'width:52px',
        'height:52px',
        'border-radius:50%',
        'overflow:hidden',
        'background:#B71C1C',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'z-index:999999',
        'pointer-events:none',
        'box-shadow:0 4px 16px rgba(183,28,28,.5)',
        'transition:none',
    ].join(';');

    if (src) {
        fly.innerHTML = '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    } else {
        fly.innerHTML = '<i class="fas fa-shopping-cart" style="color:#fff;font-size:20px;"></i>';
    }
    document.body.appendChild(fly);

    fly.style.left = startX + 'px';
    fly.style.top  = startY + 'px';

    // Target position: cart icon in sidebar
    const cartRect = cartLink.getBoundingClientRect();
    const endX = cartRect.left + cartRect.width  / 2 - 26;
    const endY = cartRect.top  + cartRect.height / 2 - 26;

    // Animate via requestAnimationFrame for smooth arc
    const duration = 600; // ms
    const startTime = performance.now();

    function step(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-in-out cubic
        const t = progress < 0.5 ? 4*progress*progress*progress : 1 - Math.pow(-2*progress+2,3)/2;
        // Arc: add upward curve via sine
        const arc = Math.sin(Math.PI * progress) * -80;
        const curX = startX + (endX - startX) * t;
        const curY = startY + (endY - startY) * t + arc;
        const scale = 1 - 0.5 * t; // shrink as it approaches cart

        fly.style.left      = curX + 'px';
        fly.style.top       = curY + 'px';
        fly.style.transform = 'scale(' + scale + ')';
        fly.style.opacity   = (1 - progress * 0.3).toString();

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            // Remove fly element and pop-bounce the cart icon
            fly.remove();
            _popCartIcon(cartLink);
        }
    }
    requestAnimationFrame(step);
}

// ── Pop-bounce the cart icon when item lands ──
function _popCartIcon(el) {
    if (!el) return;
    el.style.transition = 'transform .18s cubic-bezier(.34,1.56,.64,1)';
    el.style.transform  = 'scale(1.45)';
    setTimeout(function() {
        el.style.transform = 'scale(1)';
        setTimeout(function() { el.style.transition = ''; }, 200);
    }, 180);
}

// ── Update sidebar cart badge count from backend ──
function _updateCartBadgeSidebar() {
    // Alias — delegates to the unified real-time updater
    updateCartBadge(true);
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
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now'; }

        if (data.success) {
            window.location.href = URLS.cart + '?pay=1';
        } else {
            showToast(data.message || data.error || 'Could not process Buy Now.', 'error');
        }
    })
    .catch(() => {
        showToast('Network error. Please try again.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now'; }
    });
}

// ============================================
// UPDATE CART BADGE — Real-time via localStorage broadcast + fast polling
// ============================================

// Internal helper: apply a count value to all badge elements
function _applyCartBadgeCount(count, animate) {
    document.querySelectorAll('#cart-count-badge, .cart-count-badge').forEach(function(badge) {
        const prev = parseInt(badge.textContent, 10) || 0;
        badge.textContent   = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        if (animate && count !== prev) {
            badge.style.transition = 'transform .2s cubic-bezier(.34,1.56,.64,1)';
            badge.style.transform  = 'scale(1.6)';
            setTimeout(function() { badge.style.transform = 'scale(1)'; }, 200);
        }
    });
}

// Broadcast a new count to all open tabs via localStorage
function _broadcastCartCount(count) {
    try {
        localStorage.setItem('kabsu_cart_count', JSON.stringify({ count: count, ts: Date.now() }));
    } catch(e) {}
}

// Expose so cart.js and other modules can push a known count instantly
window.setCartBadgeCount = function(count, animate) {
    _applyCartBadgeCount(count, animate !== false);
    _broadcastCartCount(count);
};

// Listen for badge updates broadcast from other tabs or from cart.js
window.addEventListener('storage', function(e) {
    if (e.key !== 'kabsu_cart_count') return;
    try {
        const payload = JSON.parse(e.newValue);
        if (payload && typeof payload.count === 'number') {
            _applyCartBadgeCount(payload.count, true);
        }
    } catch(e) {}
});

function updateCartBadge(animate) {
    if (typeof IS_AUTHENTICATED !== 'undefined' && !IS_AUTHENTICATED) return;
    if (typeof URLS === 'undefined' || !URLS.cartCount) return;
    fetch(URLS.cartCount)
        .then(r => r.json())
        .then(data => {
            const count = parseInt(data.cart_count ?? data.count ?? 0, 10);
            _applyCartBadgeCount(count, !!animate);
            _broadcastCartCount(count);
        })
        .catch(function() {});
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

window.addEventListener('resize', () => {
    if (!isGrid) updCar();
    const asd = document.getElementById('asd');
    if (asd && asd.classList.contains('open')) positionAsd();
});

// Close ASD on scroll — the search bar scrolls with the page but the navbar is sticky,
// so repositioning the fixed dropdown causes it to overlap the navbar. Safest fix: close it.
window.addEventListener('scroll', () => {
    const asd = document.getElementById('asd');
    if (asd && asd.classList.contains('open')) {
        const cont = document.getElementById('hsContEl');
        if (!cont) { closeAsd(); return; }
        const rect = cont.getBoundingClientRect();
        // Close if search bar has scrolled behind the navbar (top < 60px) or off screen
        if (rect.bottom < 60) {
            closeAsd();
        } else {
            positionAsd();
        }
    }
}, { passive: true });

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
// ============================================
// ORDER STATUS NOTIFICATIONS — CLIENT SIDE
// Real-time polling every 15s for order updates
// ============================================

let _orderNotifTimer     = null;
let _orderNotifPanelOpen = false;
let _lastOrderNotifCount = 0;

// ── Init on DOM ready ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    if (!IS_AUTHENTICATED) return;

    // Close panel on outside click — exclude both desktop bell and mobile Updates button
    document.addEventListener('click', function (e) {
        const panel    = document.getElementById('orderNotifPanel');
        const bell     = document.getElementById('orderNotifBellBtn');
        const mobBtn   = document.getElementById('mobNotifBtn');
        if (panel && _orderNotifPanelOpen &&
            !panel.contains(e.target) &&
            !(bell   && bell.contains(e.target)) &&
            !(mobBtn && mobBtn.contains(e.target))) {
            closeOrderNotifPanel();
        }
    });

    // Bell button hover style
    const bellBtn = document.getElementById('orderNotifBellBtn');
    if (bellBtn) {
        bellBtn.addEventListener('mouseenter', function() { this.style.background = 'rgba(183,28,28,0.15)'; });
        bellBtn.addEventListener('mouseleave', function() { this.style.background = 'rgba(183,28,28,0.08)'; });
    }

    // Initial fetch + start polling
    fetchOrderNotifications();
    _orderNotifTimer = setInterval(fetchOrderNotifications, 15000);

    // Pause/resume with tab visibility
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            clearInterval(_orderNotifTimer);
        } else {
            fetchOrderNotifications();
            _orderNotifTimer = setInterval(fetchOrderNotifications, 15000);
        }
    });
});

// ── Fetch notifications from backend ──────────────────────────────────
function fetchOrderNotifications() {
    if (typeof URLS === 'undefined' || !URLS.userNotifications) return;

    fetch(URLS.userNotifications, { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.success) return;

            const count = data.unread_count || 0;

            // Update badge
            _setOrderNotifBadge(count);

            // Bounce badge if new notifications arrived
            if (count > _lastOrderNotifCount && _lastOrderNotifCount >= 0) {
                const badge = document.getElementById('orderNotifBadge');
                if (badge) {
                    badge.classList.remove('notif-bounce');
                    void badge.offsetWidth; // reflow
                    badge.classList.add('notif-bounce');
                }
                // Play a subtle sound cue (if browser allows)
                _playNotifTick();
            }
            _lastOrderNotifCount = count;

            // If panel is open, refresh its content live
            if (_orderNotifPanelOpen) {
                _renderOrderNotifList(data.notifications);
            }
        })
        .catch(function () {});
}

// ── Toggle panel open/close ────────────────────────────────────────────
function toggleOrderNotifPanel() {
    if (_orderNotifPanelOpen) {
        closeOrderNotifPanel();
    } else {
        openOrderNotifPanel();
    }
}

function openOrderNotifPanel() {
    const panel = document.getElementById('orderNotifPanel');
    if (!panel) return;
    panel.style.display = 'flex';
    _orderNotifPanelOpen = true;

    // Fetch fresh data and render
    if (typeof URLS !== 'undefined' && URLS.userNotifications) {
        fetch(URLS.userNotifications, { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) _renderOrderNotifList(data.notifications);
            })
            .catch(function () {});
    }
}

function closeOrderNotifPanel() {
    const panel = document.getElementById('orderNotifPanel');
    if (panel) panel.style.display = 'none';
    _orderNotifPanelOpen = false;
}

// ── Render the notification list inside the panel ──────────────────────
function _renderOrderNotifList(notifications) {
    const list  = document.getElementById('orderNotifList');
    const empty = document.getElementById('orderNotifEmpty');
    if (!list) return;

    if (!notifications || notifications.length === 0) {
        if (empty) empty.style.display = 'block';
        // Remove all .on-item elements
        list.querySelectorAll('.on-item').forEach(function (el) { el.remove(); });
        return;
    }

    if (empty) empty.style.display = 'none';

    // Build HTML
    // Map order status to the correct tab on the order history page
    const STATUS_TAB_MAP = {
        'to_pay':        'to_pay',
        'PENDING':       'to_pay',
        'preparing':     'preparing',
        'to_claim':      'to_claim',
        'completed':     'completed',
        'cancelled':     'completed',
        'CANCELLED':     'completed',
        'request':       'request',
        'order_received':'preparing',
        'PAID':          'to_pay',
    };

    const html = notifications.map(function (n) {
        const unreadClass = n.is_read ? '' : 'unread';
        const dot = n.is_read ? '' : '<span class="on-dot"></span>';
        const tab = STATUS_TAB_MAP[n.order_status] || 'request';
        const href = '/my-purchases/?tab=' + tab;
        return (
            '<a href="' + href + '" class="on-item ' + unreadClass + '" ' +
            'data-id="' + n.id + '" onclick="closeOrderNotifPanel()">' +
            '<div class="on-ico" style="background:' + n.color + '22;">' +
            '<i class="fas ' + n.icon + '" style="color:' + n.color + ';"></i>' +
            '</div>' +
            '<div class="on-body">' +
            '<div class="on-msg">' + _escHtml(n.message) + '</div>' +
            '<div class="on-meta">' + dot +
            '<span>' + _escHtml(n.est_name) + '</span>' +
            '<span>•</span>' +
            '<span>' + _escHtml(n.time_ago) + '</span>' +
            '</div>' +
            '</div>' +
            '</a>'
        );
    }).join('');

    // Replace only the notification items (keep empty div)
    list.querySelectorAll('.on-item').forEach(function (el) { el.remove(); });
    const frag = document.createRange().createContextualFragment(html);
    list.appendChild(frag);
}

// ── Mark all as read ───────────────────────────────────────────────────
function markAllOrderNotifsRead() {
    if (typeof URLS === 'undefined' || !URLS.markNotifsRead) return;

    fetch(URLS.markNotifsRead, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrf() },
        credentials: 'same-origin'
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data.success) {
            _setOrderNotifBadge(0);
            _lastOrderNotifCount = 0;
            // Re-render with all read
            document.querySelectorAll('.on-item.unread').forEach(function (el) {
                el.classList.remove('unread');
                const dot = el.querySelector('.on-dot');
                if (dot) dot.remove();
            });
        }
    })
    .catch(function () {});
}

// ── Update badge count ─────────────────────────────────────────────────
function _setOrderNotifBadge(count) {
    ['orderNotifBadge', 'orderNotifBadgeMob'].forEach(function(id) {
        const badge = document.getElementById(id);
        if (!badge) return;
        if (count > 0) {
            badge.textContent   = count > 99 ? '99+' : String(count);
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

// ── Subtle tick sound on new notification ─────────────────────────────
function _playNotifTick() {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type      = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) { /* AudioContext blocked — silent */ }
}

// ── Escape HTML helper (local copy so no dependency on escHtml) ────────
function _escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}









// ============================================
// FAVORITES SYSTEM — LocalStorage persistence
// Star = Establishments | Heart = Menu Items
// ============================================

const FAV_EST_KEY  = 'kabsu_fav_establishments';
const FAV_MENU_KEY = 'kabsu_fav_menu_items';
let _favActiveTab  = 'est'; // 'est' | 'menu'

// ── LocalStorage helpers ──────────────────────────────────────────────

function _getFavEsts() {
    try { return JSON.parse(localStorage.getItem(FAV_EST_KEY) || '[]'); } catch(e) { return []; }
}
function _setFavEsts(arr) {
    try { localStorage.setItem(FAV_EST_KEY, JSON.stringify(arr)); } catch(e) {}
}
function _getFavMenus() {
    try { return JSON.parse(localStorage.getItem(FAV_MENU_KEY) || '[]'); } catch(e) { return []; }
}
function _setFavMenus(arr) {
    try { localStorage.setItem(FAV_MENU_KEY, JSON.stringify(arr)); } catch(e) {}
}

// ── Toggle establishment star ─────────────────────────────────────────

function toggleFavEst(btn) {
    const estId   = parseInt(btn.dataset.estId);
    const estName = btn.dataset.estName;
    const estImg  = btn.dataset.estImage  || '';
    const estCat  = btn.dataset.estCategory || '';
    const estUrl  = btn.dataset.estUrl    || '#';

    let favs = _getFavEsts();
    const idx = favs.findIndex(function(e) { return e.id === estId; });

    if (idx !== -1) {
        // Remove
        favs.splice(idx, 1);
        btn.classList.remove('fav-active', 'fav-pop');
        btn.title = 'Save to Favorites';
        void btn.offsetWidth;
    } else {
        // Add
        favs.push({ id: estId, name: estName, image: estImg, category: estCat, url: estUrl });
        btn.classList.add('fav-active');
        btn.classList.remove('fav-pop');
        void btn.offsetWidth;
        btn.classList.add('fav-pop');
        btn.title = 'Remove from Favorites';
    }

    _setFavEsts(favs);
    _renderFavSection();
    _showFavToast(idx !== -1
        ? '<i class="fas fa-star" style="color:#eab308"></i> Removed from Favorites'
        : '<i class="fas fa-star" style="color:#eab308"></i> Saved to Favorites!', idx !== -1 ? 'info' : 'success');
}

// ── Toggle menu item heart ────────────────────────────────────────────

function toggleFavMenu(btn) {
    const menuId   = parseInt(btn.dataset.menuId);
    const menuName = btn.dataset.menuName;
    const menuImg  = btn.dataset.menuImage  || '';
    const menuPrice= btn.dataset.menuPrice  || '0';
    const estName  = btn.dataset.estName    || '';
    const estId    = parseInt(btn.dataset.estId || 0);
    const estUrl   = btn.dataset.estUrl     || '#';

    let favs = _getFavMenus();
    const idx = favs.findIndex(function(m) { return m.id === menuId; });

    if (idx !== -1) {
        favs.splice(idx, 1);
        btn.classList.remove('fav-active', 'fav-pop');
        btn.title = 'Save to Favorites';
        void btn.offsetWidth;
    } else {
        favs.push({ id: menuId, name: menuName, image: menuImg, price: menuPrice, estName: estName, estId: estId, estUrl: estUrl });
        btn.classList.add('fav-active');
        btn.classList.remove('fav-pop');
        void btn.offsetWidth;
        btn.classList.add('fav-pop');
        btn.title = 'Remove from Favorites';
    }

    _setFavMenus(favs);
    _renderFavSection();
    _showFavToast(idx !== -1
        ? '<i class="fas fa-heart" style="color:#ef4444"></i> Removed from Favorites'
        : '<i class="fas fa-heart" style="color:#ef4444"></i> Saved to Favorites!', idx !== -1 ? 'info' : 'success');
}

// ── Collapse/expand favorites section ────────────────────────────────

function toggleFavSection() {
    const sec = document.getElementById('favSection');
    if (!sec) return;
    sec.classList.toggle('collapsed');
    const btn = sec.querySelector('.fav-section-toggle-btn span');
    if (btn) btn.textContent = sec.classList.contains('collapsed') ? 'Show' : 'Hide';
}

// ── Switch tab (est / menu) ───────────────────────────────────────────

function switchFavTab(tab) {
    _favActiveTab = tab;
    document.getElementById('favTabEst').classList.toggle('active', tab === 'est');
    document.getElementById('favTabMenu').classList.toggle('active', tab === 'menu');
    _renderFavGrid();
}

// ── Remove single item from favorites grid ────────────────────────────

function removeFavEst(estId, event) {
    event.stopPropagation();
    let favs = _getFavEsts();
    favs = favs.filter(function(e) { return e.id !== estId; });
    _setFavEsts(favs);
    // Sync the star button on the card
    const btn = document.getElementById('estStarBtn-' + estId);
    if (btn) { btn.classList.remove('fav-active', 'fav-pop'); btn.title = 'Save to Favorites'; }
    _renderFavSection();
}

function removeFavMenu(menuId, event) {
    event.stopPropagation();
    let favs = _getFavMenus();
    favs = favs.filter(function(m) { return m.id !== menuId; });
    _setFavMenus(favs);
    _renderFavSection();
}

// ── Sync all heart buttons (menu items) to match LocalStorage ─────────

function _syncFavMenuButtons() {
    const favMenus = _getFavMenus();
    const favIds   = new Set(favMenus.map(function(m) { return m.id; }));
    document.querySelectorAll('.menu-fav-heart-btn[data-menu-id]').forEach(function(btn) {
        const id = parseInt(btn.dataset.menuId);
        if (favIds.has(id)) {
            btn.classList.add('fav-active');
            btn.title = 'Remove from Favorites';
        } else {
            btn.classList.remove('fav-active', 'fav-pop');
            btn.title = 'Save to Favorites';
        }
    });
}

// ── Render the favorites section — now just updates badges ───────────

function _renderFavSection() {
    const ests  = _getFavEsts();
    const menus = _getFavMenus();
    const total = ests.length + menus.length;

    // Update count stubs (kept for JS compat)
    const tc = document.getElementById('favTotalCount');
    const ec = document.getElementById('favEstCount');
    const mc = document.getElementById('favMenuCount');
    if (tc) tc.textContent = total;
    if (ec) ec.textContent = ests.length;
    if (mc) mc.textContent = menus.length;

    // ── Sidebar badge ──
    const sidebarBadge = document.getElementById('sidebar-fav-badge');
    if (sidebarBadge) {
        sidebarBadge.textContent = total;
        sidebarBadge.style.display = total > 0 ? 'flex' : 'none';
    }
    // ── Mobile nav badge ──
    const mobBadge = document.getElementById('mob-fav-badge');
    if (mobBadge) {
        mobBadge.textContent = total;
        mobBadge.style.display = total > 0 ? 'flex' : 'none';
    }

    // Sync all heart buttons
    _syncFavMenuButtons();
}

// ── _renderFavGrid: replaced by dedicated favorites.html page ─────────
function _renderFavGrid() { /* no-op: rendering is done in favorites.html */ }

// ── Sync all star buttons to match LocalStorage state ─────────────────

function _syncFavButtons() {
    const favEsts = _getFavEsts();
    const favIds  = new Set(favEsts.map(function(e) { return e.id; }));
    document.querySelectorAll('.est-fav-star-btn[data-est-id]').forEach(function(btn) {
        const id = parseInt(btn.dataset.estId);
        if (favIds.has(id)) {
            btn.classList.add('fav-active');
            btn.title = 'Remove from Favorites';
        } else {
            btn.classList.remove('fav-active');
            btn.title = 'Save to Favorites';
        }
    });
}

// ── Tiny toast for favorites (reuses existing showToast if available) ─

function _showFavToast(html, type) {
    const colors  = { success: '#10b981', info: '#6b7280', error: '#ef4444' };
    const bgColors = { success: '#f0fdf4', info: '#f9fafb', error: '#fef2f2' };
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:none;';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.style.cssText = 'background:' + (bgColors[type]||'#fff') + ';border-left:5px solid ' + (colors[type]||'#6b7280') + ';border-radius:10px;padding:12px 18px;box-shadow:0 6px 24px rgba(0,0,0,0.13);display:flex;align-items:center;gap:10px;font-family:Poppins,sans-serif;font-size:13px;font-weight:600;color:#1f2937;min-width:220px;pointer-events:auto;animation:toastSlideIn .3s cubic-bezier(.34,1.56,.64,1);';
    t.innerHTML = html;
    container.appendChild(t);
    setTimeout(function() {
        t.style.transition = 'opacity .35s ease, transform .35s ease';
        t.style.opacity = '0';
        t.style.transform = 'translateY(-8px)';
        setTimeout(function() { t.remove(); }, 380);
    }, 2400);
}

// ── Init on DOM ready ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    _syncFavButtons();       // sync establishment star buttons
    _syncFavMenuButtons();   // sync menu item heart buttons
    _renderFavSection();     // update badges

    // Listen for cross-tab favorites changes
    window.addEventListener('storage', function(e) {
        if (e.key === FAV_EST_KEY || e.key === FAV_MENU_KEY) {
            _syncFavButtons();
            _syncFavMenuButtons();
            _renderFavSection();
        }
    });
});