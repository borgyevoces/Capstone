// ============================================================
// ✅ UPDATED: Real-time Status Updater for KabsuEats
// Combines:
//   1. Client-side instant Open/Closed from opening/closing times
//   2. Backend polling for live menu quantities, ratings, review counts
// ============================================================

(function () {
    'use strict';

    // ── Polling interval ─────────────────────────────────────────
    const STATUS_CHECK_INTERVAL_MS = 60000;   // 1 min — client-side only (cheap)
    const BACKEND_POLL_INTERVAL_MS = 30000;   // 30 s  — backend API (menu/rating)
    const MAX_RETRIES = 3;

    let backendRetryCount = 0;
    let backendPollTimer  = null;
    let statusTimer       = null;


    // ===========================================================
    // PART 1 — CLIENT-SIDE STATUS CALCULATION
    // (No API call needed — uses opening/closing times in DOM)
    // ===========================================================

    /** Get current time in minutes since midnight */
    function getCurrentMinutes() {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }

    /** Convert "HH:MM" string to minutes since midnight */
    function timeToMinutes(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const parts = timeStr.trim().split(':');
        if (parts.length !== 2) return null;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
    }

    /** Calculate Open/Closed from HH:MM strings */
    function calculateStatus(openingTime, closingTime) {
        if (!openingTime || !closingTime) return 'Closed';
        const cur  = getCurrentMinutes();
        const open = timeToMinutes(openingTime);
        const close = timeToMinutes(closingTime);
        if (open === null || close === null) return 'Closed';
        // Normal hours e.g. 08:00 - 22:00
        if (open <= close) return (cur >= open && cur <= close) ? 'Open' : 'Closed';
        // Overnight hours e.g. 22:00 - 02:00
        return (cur >= open || cur <= close) ? 'Open' : 'Closed';
    }

    /** Update a single status badge DOM element */
    function updateStatusElement(element, status) {
        if (!element) return;
        const isOpen = status === 'Open';

        element.classList.remove('open', 'closed', 'status-open', 'status-closed');
        element.classList.add(isOpen ? 'open' : 'closed');
        element.classList.add(isOpen ? 'status-open' : 'status-closed');

        // Inner .status-text span
        const statusText = element.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = status;
        } else if (element.innerHTML.includes('✅') || element.innerHTML.includes('🔒')) {
            element.innerHTML = isOpen ? '✅ Open Now' : '🔒 Closed Now';
        } else {
            element.textContent = isOpen ? 'Open Now' : 'Closed Now';
        }

        // Dot color
        const dot = element.querySelector('.dot, .estb-dot');
        if (dot) dot.style.backgroundColor = isOpen ? '#10b981' : '#ef4444';
    }

    /**
     * Update ALL status elements across all page types.
     * Works on: main KabsuEats page, establishment details page, owner dashboard.
     */
    function updateAllClientStatuses() {
        let updated = 0;

        // ── 1. Main page — establishment cards (.food-est-item or .food-establishment-item) ──
        document.querySelectorAll(
            '.food-est-item[data-opening-time], .food-establishment-item[data-opening-time]'
        ).forEach(function (item) {
            const open  = item.dataset.openingTime;
            const close = item.dataset.closingTime;
            if (!open || !close) return;

            const status   = calculateStatus(open, close);
            const isOpen   = status === 'Open';
            const badgeTxt = isOpen ? 'Open' : 'Closed';

            // estb / sp badge (kabsueats cards)
            const estbBadge = item.querySelector('.estb, .sp');
            if (estbBadge) {
                estbBadge.className = estbBadge.className.replace(/\b(open|closed)\b/g, '').trim() + ` ${isOpen ? 'open' : 'closed'}`;
                const dot = estbBadge.querySelector('.estb-dot');
                estbBadge.innerHTML = '';
                if (dot) estbBadge.appendChild(dot);
                estbBadge.appendChild(document.createTextNode(badgeTxt));
            }

            // .status-indicator (old pattern)
            const indicator = item.querySelector('.status-indicator');
            if (indicator) updateStatusElement(indicator, status);

            // data-status attr used by search/filter JS
            item.setAttribute('data-status', isOpen ? 'open' : 'closed');
            updated++;
        });

        // ── 2. Detail page — #detailStatusBadge ──
        const detailBadge = document.getElementById('detailStatusBadge');
        if (detailBadge) {
            const open  = detailBadge.dataset.openingTime;
            const close = detailBadge.dataset.closingTime;
            if (open && close) {
                const status = calculateStatus(open, close);
                updateStatusElement(detailBadge, status);
                updated++;
            }
        }

        // ── 3. Detail page — #liveEstStatus (hero banner badge, injected by this script) ──
        const liveHeroBadge = document.getElementById('liveEstStatus');
        if (liveHeroBadge) {
            const open  = liveHeroBadge.dataset.openingTime;
            const close = liveHeroBadge.dataset.closingTime;
            if (open && close) {
                const status = calculateStatus(open, close);
                const isOpen = status === 'Open';
                liveHeroBadge.textContent = isOpen ? 'Open' : 'Closed';
                liveHeroBadge.className = `live-est-status-badge ${isOpen ? 'open' : 'closed'}`;
                updated++;
            }
        }

        // ── 4. Live hours badge in detail page ──
        const liveHoursBadge = document.getElementById('liveHoursStatus');
        if (liveHoursBadge) {
            const open  = liveHoursBadge.dataset.openingTime;
            const close = liveHoursBadge.dataset.closingTime;
            if (open && close) {
                const status = calculateStatus(open, close);
                const isOpen = status === 'Open';
                liveHoursBadge.textContent = isOpen ? 'Open' : 'Closed';
                liveHoursBadge.className = `live-hours-badge ${isOpen ? 'open' : 'closed'}`;
                updated++;
            }
        }

        // ── 5. Owner dashboard — #establishmentStatus ──
        const dashboardBadge = document.getElementById('establishmentStatus');
        if (dashboardBadge) {
            const open  = dashboardBadge.dataset.openingTime;
            const close = dashboardBadge.dataset.closingTime;
            if (open && close) {
                const status = calculateStatus(open, close);
                updateStatusElement(dashboardBadge, status);
                updated++;
            }
        }

        // ── 6. Any remaining .status-badge elements with data-opening-time ──
        document.querySelectorAll('.status-badge[data-opening-time]').forEach(function (el) {
            if (el.id === 'detailStatusBadge' || el.id === 'establishmentStatus') return; // already handled
            const open  = el.dataset.openingTime;
            const close = el.dataset.closingTime;
            if (!open || !close) return;
            const status = calculateStatus(open, close);
            updateStatusElement(el, status);
            updated++;
        });

        if (updated > 0) {
            console.log(`✅ [StatusUpdater] Updated ${updated} status badge(s) at ${new Date().toLocaleTimeString()}`);
        }
    }


    // ===========================================================
    // PART 2 — BACKEND POLLING (menu quantities, ratings, counts)
    // Only active on establishment DETAILS page where ESTABLISHMENT_ID is set.
    // ===========================================================

    function getEstablishmentId() {
        return (typeof ESTABLISHMENT_ID !== 'undefined' && ESTABLISHMENT_ID)
            ? parseInt(ESTABLISHMENT_ID) : null;
    }

    function getRealtimeUrl() {
        // Prefer the Django-rendered URL constant; fall back to pattern
        if (typeof ESTABLISHMENT_REALTIME_URL !== 'undefined' && ESTABLISHMENT_REALTIME_URL) {
            return ESTABLISHMENT_REALTIME_URL;
        }
        const estId = getEstablishmentId();
        return estId ? `/api/establishment/${estId}/realtime/` : null;
    }

    /** Update menu item cards from fresh backend data */
    function updateMenuItemsFromBackend(menuItems) {
        if (!Array.isArray(menuItems)) return;
        const isAuth = (typeof IS_USER_AUTHENTICATED !== 'undefined') && IS_USER_AUTHENTICATED;

        menuItems.forEach(function (item) {
            const card = document.querySelector(`.menu-item[data-item-id="${item.id}"]`);
            if (!card) return;

            const qty      = item.quantity || 0;
            const isAvail  = qty > 0;
            const isTop    = item.is_top_seller;

            // data attributes (used by filter JS)
            card.setAttribute('data-item-quantity', qty);
            card.setAttribute('data-is-top-seller', isTop ? 'true' : 'false');

            // Stock badge (top-right of image)
            const stockBadge = card.querySelector('.badge-stock');
            if (stockBadge) {
                stockBadge.className = isAvail ? 'badge-stock available' : 'badge-stock out-of-stock';
                stockBadge.innerHTML = isAvail
                    ? `<i class="fas fa-check-circle"></i> Available: ${qty}`
                    : `<i class="fas fa-times-circle"></i> Out of Stock`;
            }

            // Best seller badge
            const bsBadge = card.querySelector('.badge-top-seller');
            if (bsBadge) bsBadge.style.display = isTop ? '' : 'none';

            // Action buttons — only rebuild if state changed
            if (isAuth) {
                const actionsDiv = card.querySelector('.item-actions');
                if (actionsDiv) {
                    const hasDisabled  = !!actionsDiv.querySelector('.btn-add-to-cart.disabled');
                    const hasActive    = !!actionsDiv.querySelector('.item-action-buttons');
                    if (!isAvail && hasActive) {
                        actionsDiv.innerHTML = `
                            <button class="btn-add-to-cart disabled" disabled>
                                <i class="fas fa-times-circle"></i> Out of Stock
                            </button>`;
                    } else if (isAvail && hasDisabled) {
                        actionsDiv.innerHTML = `
                            <div class="item-action-buttons">
                                <button class="btn-add-to-cart quick-add-btn"
                                        onclick="openItemDetailModal(this.closest('.menu-item'), 'cart'); event.stopPropagation();">
                                    <i class="fas fa-cart-plus"></i> Add to Cart
                                </button>
                                <button class="btn-buy-now quick-buy-btn"
                                        onclick="openItemDetailModal(this.closest('.menu-item'), 'buynow'); event.stopPropagation();">
                                    <i class="fas fa-money-bill"></i> Buy Now
                                </button>
                            </div>`;
                    }
                }
            }
        });
    }

    /** Update the star rating and review count from fresh backend data */
    function updateRatingFromBackend(avgRating, reviewCount) {
        if (avgRating === undefined || avgRating === null) return;

        // Rating number
        const numEl = document.querySelector('#averageRatingDisplay .rating-number');
        if (numEl) numEl.textContent = parseFloat(avgRating).toFixed(1);

        // Stars
        const starsEl = document.querySelector('#averageRatingDisplay .star-rating-main');
        if (starsEl) {
            const rounded = Math.round(avgRating);
            starsEl.innerHTML = [1,2,3,4,5].map(i =>
                i <= rounded
                    ? '<i class="fas fa-star filled"></i>'
                    : '<i class="far fa-star"></i>'
            ).join('');
        }

        // Count text
        if (reviewCount !== undefined) {
            const cntEl = document.querySelector('#averageRatingDisplay .review-count-text');
            if (cntEl) cntEl.textContent = `(${reviewCount} Review${reviewCount !== 1 ? 's' : ''})`;
        }
    }

    /** Update the hero live-status badge + hours badge using backend status */
    function updateHeroBadgesFromBackend(status, openingTime, closingTime) {
        const isOpen   = (status || '').toLowerCase() === 'open';
        const statusTxt = isOpen ? 'Open' : 'Closed';

        // Hero badge
        const heroBadge = document.getElementById('liveEstStatus');
        if (heroBadge) {
            heroBadge.textContent = statusTxt;
            heroBadge.className   = `live-est-status-badge ${isOpen ? 'open' : 'closed'}`;
        }

        // Hours badge
        const hoursBadge = document.getElementById('liveHoursStatus');
        if (hoursBadge) {
            hoursBadge.textContent = statusTxt;
            hoursBadge.className   = `live-hours-badge ${isOpen ? 'open' : 'closed'}`;
        }

        // Item modal status
        const modalStatus = document.getElementById('itemModalEstStatus');
        if (modalStatus) {
            modalStatus.textContent = `● ${statusTxt}`;
            modalStatus.className   = `item-modal-est-status ${isOpen ? 'open' : 'closed'}`;
        }

        // Also update #detailStatusBadge text (if it exists)
        const detailBadge = document.getElementById('detailStatusBadge');
        if (detailBadge) updateStatusElement(detailBadge, isOpen ? 'Open' : 'Closed');
    }

    /** Pulse the live-indicator dot to show a successful refresh */
    function pulseLiveDot() {
        const dot = document.getElementById('liveIndicatorDot');
        if (!dot) return;
        dot.className = 'live-indicator-dot active';
        clearTimeout(dot._dimTimer);
        dot._dimTimer = setTimeout(() => dot.className = 'live-indicator-dot idle', 2000);
    }

    /** Main backend poll — fetch fresh data and update DOM */
    function pollBackend() {
        const url = getRealtimeUrl();
        if (!url) return; // Not on a details page

        fetch(url, { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(function (data) {
                if (!data.success) return;
                backendRetryCount = 0;

                updateMenuItemsFromBackend(data.menu_items);
                updateRatingFromBackend(data.average_rating, data.review_count);
                updateHeroBadgesFromBackend(data.status, data.opening_time, data.closing_time);
                pulseLiveDot();
            })
            .catch(function (err) {
                backendRetryCount++;
                console.warn('[StatusUpdater] Backend poll failed:', err.message,
                    `(retry ${backendRetryCount}/${MAX_RETRIES})`);
                const dot = document.getElementById('liveIndicatorDot');
                if (dot) dot.className = 'live-indicator-dot error';

                if (backendRetryCount >= MAX_RETRIES) {
                    clearInterval(backendPollTimer);
                    backendPollTimer = setInterval(pollBackend, BACKEND_POLL_INTERVAL_MS * 3);
                }
            });
    }


    // ===========================================================
    // PART 3 — INJECT HERO BADGES + STYLES (details page only)
    // ===========================================================

    function injectDetailPageBadges() {
        if (!document.getElementById('statusUpdaterStyles')) {
            const style = document.createElement('style');
            style.id = 'statusUpdaterStyles';
            style.textContent = `
                .live-est-status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 700;
                    font-family: 'Poppins', sans-serif;
                    margin-top: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    transition: background 0.4s, color 0.4s;
                }
                .live-est-status-badge.open {
                    background: linear-gradient(135deg,#d1fae5,#a7f3d0);
                    color: #065f46;
                    border: 1.5px solid #34d399;
                }
                .live-est-status-badge.open::before  { content: "● "; color: #10b981; }
                .live-est-status-badge.closed {
                    background: linear-gradient(135deg,#fee2e2,#fecaca);
                    color: #991b1b;
                    border: 1.5px solid #f87171;
                }
                .live-est-status-badge.closed::before { content: "● "; color: #ef4444; }

                .live-hours-badge {
                    display: inline-flex;
                    align-items: center;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 2px 9px;
                    border-radius: 10px;
                    margin-left: 6px;
                    vertical-align: middle;
                }
                .live-hours-badge.open   { background:#d1fae5; color:#065f46; }
                .live-hours-badge.closed { background:#fee2e2; color:#991b1b; }

                .live-indicator-dot {
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    margin-left: 6px;
                    vertical-align: middle;
                    transition: background 0.3s;
                }
                .live-indicator-dot.active {
                    background: #10b981;
                    box-shadow: 0 0 0 3px rgba(16,185,129,.3);
                    animation: livePulse .8s ease-out;
                }
                .live-indicator-dot.idle  { background: #9ca3af; }
                .live-indicator-dot.error { background: #ef4444; }
                @keyframes livePulse {
                    0%   { transform: scale(1.5); opacity:.4; }
                    100% { transform: scale(1);   opacity:1;  }
                }
            `;
            document.head.appendChild(style);
        }

        // Hero badge
        const heroContent = document.querySelector('.hero-content');
        if (heroContent && !document.getElementById('liveEstStatus')) {
            const badge = document.createElement('div');
            badge.id = 'liveEstStatus';
            badge.className = 'live-est-status-badge';
            // seed data attrs so client-side calc works instantly too
            const open24  = typeof EST_OPENING_24H !== 'undefined' ? EST_OPENING_24H : '';
            const close24 = typeof EST_CLOSING_24H !== 'undefined' ? EST_CLOSING_24H : '';
            if (open24) badge.dataset.openingTime = open24;
            if (close24) badge.dataset.closingTime = close24;
            badge.textContent = open24 && close24
                ? (calculateStatus(open24, close24) === 'Open' ? 'Open' : 'Closed')
                : '...';
            heroContent.appendChild(badge);
        }

        // Hours badge (next to hours text)
        const hoursEl = document.querySelector('.hours-text');
        if (hoursEl && !document.getElementById('liveHoursStatus')) {
            const hBadge = document.createElement('span');
            hBadge.id = 'liveHoursStatus';
            hBadge.className = 'live-hours-badge';
            const open24  = typeof EST_OPENING_24H !== 'undefined' ? EST_OPENING_24H : '';
            const close24 = typeof EST_CLOSING_24H !== 'undefined' ? EST_CLOSING_24H : '';
            if (open24) hBadge.dataset.openingTime = open24;
            if (close24) hBadge.dataset.closingTime = close24;
            hBadge.textContent = open24 && close24
                ? (calculateStatus(open24, close24) === 'Open' ? 'Open' : 'Closed')
                : '...';
            hoursEl.after(hBadge);
        }

        // Live indicator dot next to Menu title
        const menuTitle = document.querySelector('.menu-title-centered span');
        if (menuTitle && !document.getElementById('liveIndicatorDot')) {
            const dot = document.createElement('span');
            dot.id = 'liveIndicatorDot';
            dot.className = 'live-indicator-dot idle';
            dot.title = 'Live data — refreshes every 30s';
            menuTitle.appendChild(dot);
        }
    }


    // ===========================================================
    // PART 4 — INIT
    // ===========================================================

    function init() {
        console.log('🔄 [StatusUpdater] Initializing…');

        // ── A. Inject badges on details page ──
        if (getEstablishmentId()) {
            injectDetailPageBadges();
        }

        // ── B. Client-side status update (instant, every 60 s) ──
        updateAllClientStatuses();
        statusTimer = setInterval(updateAllClientStatuses, STATUS_CHECK_INTERVAL_MS);

        // ── C. Backend poll for menu/rating/quantity (every 30 s, details page only) ──
        if (getEstablishmentId()) {
            pollBackend(); // immediate first call
            backendPollTimer = setInterval(pollBackend, BACKEND_POLL_INTERVAL_MS);
        }

        // ── D. Pause all polling when tab hidden, resume when visible ──
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                clearInterval(statusTimer);
                clearInterval(backendPollTimer);
            } else {
                updateAllClientStatuses();
                statusTimer = setInterval(updateAllClientStatuses, STATUS_CHECK_INTERVAL_MS);
                if (getEstablishmentId()) {
                    backendRetryCount = 0;
                    pollBackend();
                    backendPollTimer = setInterval(pollBackend, BACKEND_POLL_INTERVAL_MS);
                }
            }
        });

        console.log('✅ [StatusUpdater] Started — client: 60 s, backend: 30 s');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();