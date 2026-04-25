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
    let lastKnownModified = 0;  // ✅ track last_modified from backend


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

    /**
     * ✅ FIX: Returns true when an element carries a server-authoritative
     * "disabled / closed" status override (data-force-status attribute).
     * When true, status_updater MUST show "Closed" regardless of the current
     * clock time — the owner has manually toggled the store off.
     */
    function isForceDisabled(el) {
        if (!el) return false;
        const fs = (el.dataset.forceStatus || '').toLowerCase();
        return fs === 'disabled' || fs === 'closed';
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
        // ✅ FIXED: Do NOT recompute status from opening/closing hours here.
        //    The authoritative source is establishment.status (the owner's manual toggle),
        //    which is set in the template (data-status attr) and kept fresh by
        //    refreshEstablishmentCardStatuses() in kabsueats.js every 30s.
        //    Recomputing from hours would override the owner's "Closed" override with
        //    "Open" whenever the clock falls inside business hours — causing the mismatch
        //    between the kabsueats cards and the details page.
        document.querySelectorAll(
            '.food-est-item, .food-establishment-item'
        ).forEach(function (item) {
            // Read the authoritative status that was set by the server / kabsueats.js poll
            const status = (item.getAttribute('data-status') || '').toLowerCase();
            if (!status) return;

            const isOpen   = status === 'open';
            const badgeTxt = isOpen ? 'Open' : 'Closed';

            // Sync the visible badge class + text to match data-status
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
            if (indicator) updateStatusElement(indicator, isOpen ? 'Open' : 'Closed');

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
            // ✅ FIX: If the owner has manually toggled the store Closed/Disabled,
            //    data-force-status="disabled" is set. Always show Closed in that case —
            //    never let time-based calculation flip it back to Open.
            const forcedClosed = isForceDisabled(dashboardBadge);
            const open  = dashboardBadge.dataset.openingTime;
            const close = dashboardBadge.dataset.closingTime;
            if (forcedClosed) {
                updateStatusElement(dashboardBadge, 'Closed');
                updated++;
            } else if (open && close) {
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

        // ── 7. Owner dashboard hero card — #heroStatusBadge ──
        // NOTE: This has class "hero-status-badge" (not "status-badge") so section 6 misses it.
        // We update heroStatusDot and heroStatusText directly to preserve inner HTML structure.
        const heroStatusBadge = document.getElementById('heroStatusBadge');
        if (heroStatusBadge) {
            // ✅ FIX: Respect the owner's manual toggle — if force-status is "disabled",
            //    always render Closed; never let time-based calc flip it back to Open.
            const forcedClosed = isForceDisabled(heroStatusBadge);
            const open  = heroStatusBadge.dataset.openingTime;
            const close = heroStatusBadge.dataset.closingTime;

            let isOpen;
            if (forcedClosed) {
                isOpen = false;
            } else if (open && close) {
                isOpen = calculateStatus(open, close) === 'Open';
            } else {
                isOpen = null; // unknown — don't update
            }

            if (isOpen !== null) {
                // Update the dot color
                const dot = document.getElementById('heroStatusDot');
                if (dot) {
                    dot.className = 'hero-status-dot' + (isOpen ? '' : ' closed');
                }

                // Update the text label
                const txt = document.getElementById('heroStatusText');
                if (txt) {
                    txt.textContent = isOpen ? 'Open Now' : 'Closed';
                }

                // ✅ FIX: Also sync the sidebar (no separate loop for sidebar in status_updater)
                const sdot = document.getElementById('sidebarStatusDot');
                const stxt = document.getElementById('sidebarStatusText');
                if (sdot) {
                    sdot.style.backgroundColor = isOpen ? '#10b981' : '#ef4444';
                    sdot.style.display         = 'inline-block';
                    sdot.style.width           = '8px';
                    sdot.style.height          = '8px';
                    sdot.style.borderRadius    = '50%';
                }
                if (stxt) stxt.textContent = isOpen ? 'Open Now' : 'Closed';

                updated++;
                console.log('🟢 [StatusUpdater] Hero badge →', isOpen ? 'Open' : 'Closed', 'at', new Date().toLocaleTimeString());
            }
        }

        // ── 8. Owner dashboard — top navbar badge (#navbarStatusBadge) ──
        // NOTE: class is "navbar-status-badge" (not "status-badge") so section 6 misses it.
        // This uses SCHEDULE-BASED calculation only (no force-disable override) so the
        // navbar always reflects today's BusinessHours in real time — the store shows
        // "Open" during its scheduled hours and flips to "Closed" automatically at closing time.
        const navbarStatusBadge = document.getElementById('navbarStatusBadge');
        if (navbarStatusBadge) {
            const navOpen  = navbarStatusBadge.dataset.openingTime;
            const navClose = navbarStatusBadge.dataset.closingTime;

            if (navOpen && navClose) {
                const navIsOpen = calculateStatus(navOpen, navClose) === 'Open';

                // Badge wrapper class
                navbarStatusBadge.classList.toggle('open-nav', navIsOpen);

                // Dot
                const navDot = document.getElementById('navbarStatusDot');
                if (navDot) {
                    navDot.classList.toggle('closed', !navIsOpen);
                }

                // Text
                const navText = document.getElementById('navbarStatusText');
                if (navText) {
                    navText.textContent = navIsOpen ? 'Open' : 'Closed';
                }

                updated++;
                console.log('🟢 [StatusUpdater] Navbar badge →', navIsOpen ? 'Open' : 'Closed',
                    '(' + navOpen + '–' + navClose + ') at', new Date().toLocaleTimeString());
            }
        }

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

    /** Update establishment detail fields from fresh backend data (details page) */
    function updateEstablishmentDetailsFromBackend(data) {
        // ── Name (hero h1 + page title) ──────────────────────────────────
        if (data.name) {
            const nameEl = document.getElementById('detailEstName');
            if (nameEl) nameEl.textContent = data.name;
            // Also update chat/modal references that show the name
            document.querySelectorAll('.item-modal-est-name').forEach(el => el.textContent = data.name);
            document.title = data.name + ' - KabsuEats';
        }

        // ── Hero background image ─────────────────────────────────────────
        if (data.image_url) {
            const hero = document.getElementById('detailHeroHeader');
            if (hero) hero.style.backgroundImage = `url('${data.image_url}')`;
        }

        // ── Address ───────────────────────────────────────────────────────
        if (data.address) {
            const addrEl = document.getElementById('detailAddress');
            if (addrEl) addrEl.textContent = data.address;
        }

        // ── Categories ────────────────────────────────────────────────────
        if (data.categories) {
            const catEl = document.getElementById('detailCategories');
            if (catEl) catEl.textContent = data.categories;
        }

        // ── Hours (opening – closing) ─────────────────────────────────────
        if (data.opening_time && data.closing_time) {
            const hoursEl = document.getElementById('detailHours');
            if (hoursEl) {
                // Remove any injected liveHoursStatus badge so we can reset cleanly
                const liveBadge = document.getElementById('liveHoursStatus');
                hoursEl.textContent = `${data.opening_time} – ${data.closing_time}`;
                if (liveBadge) hoursEl.after(liveBadge);
            }
            // Also update the data-attrs used by client-side status calc
            const heroBadge = document.getElementById('liveEstStatus');
            if (heroBadge) {
                heroBadge.dataset.openingTime = data.opening_24h || '';
                heroBadge.dataset.closingTime = data.closing_24h || '';
            }
            const hoursBadge = document.getElementById('liveHoursStatus');
            if (hoursBadge) {
                hoursBadge.dataset.openingTime = data.opening_24h || '';
                hoursBadge.dataset.closingTime = data.closing_24h || '';
            }
            const detailBadge = document.getElementById('detailStatusBadge');
            if (detailBadge) {
                detailBadge.dataset.openingTime = data.opening_24h || '';
                detailBadge.dataset.closingTime = data.closing_24h || '';
            }
        }

        // ── Payment Methods ───────────────────────────────────────────────
        if (data.payment_methods !== undefined) {
            const pmEl = document.getElementById('detailPayment');
            if (pmEl) pmEl.textContent = data.payment_methods || 'N/A';
            // Also update the item-modal payment display if present
            const modalPm = document.getElementById('itemModalPayment');
            if (modalPm) modalPm.textContent = data.payment_methods || 'N/A';
        }

        // ── Amenities list ────────────────────────────────────────────────
        if (data.amenities !== undefined) {
            const amenEl = document.getElementById('detailAmenities');
            if (amenEl) {
                if (data.amenities && data.amenities.length > 0) {
                    amenEl.innerHTML = data.amenities.split(',').map(a =>
                        `<li><i class="fas fa-check-circle"></i> ${a.trim()}</li>`
                    ).join('');
                } else {
                    amenEl.innerHTML = '<li>No amenities listed.</li>';
                }
            }
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

    /**
     * Rebuild the #weeklyHoursDisplay grid from fresh backend data.
     * Called every 30 s by the backend poller on the details page.
     */
    function updateWeeklyHoursFromBackend(weeklyHours, todayIdx, currentStatus) {
        const grid = document.getElementById('weeklyHoursDisplay');
        if (!grid || !Array.isArray(weeklyHours) || weeklyHours.length === 0) return;

        grid.innerHTML = '';

        weeklyHours.forEach(function (entry) {
            const isToday  = entry.is_today || entry.day === todayIdx;
            const isClosed = entry.is_closed;
            const hasHours = !isClosed && entry.opening && entry.closing;

            const row = document.createElement('div');
            row.className = 'wh-row' + (isToday ? ' wh-today' : '');

            const daySpan = document.createElement('span');
            daySpan.className = 'wh-day';
            daySpan.textContent = entry.day_name;
            if (isToday) {
                const tag = document.createElement('span');
                tag.className = 'wh-now-tag';
                tag.textContent = 'Today';
                daySpan.appendChild(tag);
            }
            row.appendChild(daySpan);

            const timeSpan = document.createElement('span');
            if (isClosed) {
                timeSpan.className = 'wh-time wh-closed';
                timeSpan.textContent = 'Closed';
            } else if (hasHours) {
                timeSpan.className = 'wh-time';
                timeSpan.textContent = entry.opening + ' – ' + entry.closing;
            } else {
                timeSpan.className = 'wh-time wh-not-set';
                timeSpan.textContent = 'Not set';
            }
            row.appendChild(timeSpan);

            // Live status pill only for today
            if (isToday && hasHours) {
                const pill = document.createElement('span');
                pill.id = 'liveHoursStatusPill';
                const isOpen = (currentStatus || '').toLowerCase() === 'open';
                pill.className = 'wh-status-pill ' + (isOpen ? 'wh-open' : 'wh-closed-pill');
                pill.textContent = isOpen ? 'Open' : 'Closed';
                row.appendChild(pill);
            }

            grid.appendChild(row);
        });
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

                // ✅ Detect dashboard change — re-poll immediately next tick
                const serverModified = data.last_modified || 0;
                if (serverModified && lastKnownModified && serverModified > lastKnownModified) {
                    console.log('🔄 [StatusUpdater] Dashboard change detected — syncing now');
                    lastKnownModified = serverModified;
                    clearInterval(backendPollTimer);
                    backendPollTimer = setInterval(pollBackend, BACKEND_POLL_INTERVAL_MS);
                } else if (serverModified) {
                    lastKnownModified = serverModified;
                }

                updateMenuItemsFromBackend(data.menu_items);
                updateRatingFromBackend(data.average_rating, data.review_count);
                updateHeroBadgesFromBackend(data.status, data.opening_time, data.closing_time);
                updateEstablishmentDetailsFromBackend(data);
                updateWeeklyHoursFromBackend(data.weekly_hours, data.today_weekday, data.status);
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


        // ✅ No injected hero badge — detailStatusBadge already exists in the HTML template.
        // Alias it as liveEstStatus so updateHeroBadgesFromBackend keeps working.
        if (!document.getElementById('liveEstStatus')) {
            const existing = document.getElementById('detailStatusBadge');
            if (existing) existing.id = 'liveEstStatus';
        }

        // ✅ Hours badge removed — the Open/Closed pill below the hours text is no longer shown.
        // All getElementById('liveHoursStatus') calls below are safe — they return null gracefully.

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

        // ── F. On ALL owner pages: immediately fetch today's authoritative hours ──
        // Now runs on ANY owner page with #navbarStatusBadge (dashboard, orders,
        // transactions, ratings, cancelled-orders) so Open/Closed is correct on load.
        const _dashId = (typeof DASHBOARD_EST_ID !== 'undefined') ? parseInt(DASHBOARD_EST_ID) : null;
        if (_dashId && document.getElementById('navbarStatusBadge')) {
            _fetchAndPatchEstCard(_dashId);
        }

        // ── E. BroadcastChannel — instant cross-tab sync ──────────────────
        // When the owner saves BusinessHours in the profile/settings page,
        // every other open tab (details, kabsueats, dashboard) reacts immediately.
        try {
            const _bc = new BroadcastChannel('kabsueats_hours');
            _bc.onmessage = function (event) {
                const msg = event.data;
                if (!msg || msg.type !== 'hours_updated') return;

                const updatedId = msg.establishment_id;
                console.log('📡 [StatusUpdater] hours_updated broadcast for est #' + updatedId);

                // 1. Always re-run client-side status badges immediately
                updateAllClientStatuses();

                // 2. If we are on the DETAILS page for this establishment → re-poll backend now
                const thisEstId = getEstablishmentId();
                if (thisEstId && thisEstId === updatedId) {
                    console.log('🔄 [StatusUpdater] Details page — immediate backend re-poll');
                    clearInterval(backendPollTimer);
                    pollBackend();
                    backendPollTimer = setInterval(pollBackend, BACKEND_POLL_INTERVAL_MS);
                    return;
                }

                // 3. Otherwise (kabsueats, dashboard) — fetch just today's hours for
                //    this establishment and patch its data-opening/closing-time attributes,
                //    then re-run the client-side badge calculation.
                _fetchAndPatchEstCard(updatedId);
            };
        } catch (e) {
            console.warn('[StatusUpdater] BroadcastChannel not available:', e.message);
        }
    }

    /**
     * Fetches realtime data for a single establishment and patches:
     *  – data-opening-time / data-closing-time on its card (kabsueats / dashboard)
     *  – The weekly hours grid if #weeklyHoursDisplay is present (details page)
     * Then re-runs updateAllClientStatuses() so badges flip instantly.
     */
    function _fetchAndPatchEstCard(estId) {
        if (!estId) return;
        const url = '/api/establishment/' + estId + '/realtime/';
        fetch(url, { credentials: 'same-origin' })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) {
                if (!data || !data.success) return;

                // ── Patch card data-attrs on kabsueats ──────────────────────
                const cards = document.querySelectorAll(
                    '.food-est-item[data-id="' + estId + '"], ' +
                    '.food-establishment-item[data-id="' + estId + '"]'
                );
                cards.forEach(function (card) {
                    if (data.opening_24h) card.setAttribute('data-opening-time', data.opening_24h);
                    if (data.closing_24h) card.setAttribute('data-closing-time', data.closing_24h);
                    // ✅ FIXED: Also update data-status from the server's authoritative
                    //    establishment.status so updateAllClientStatuses() syncs correctly.
                    if (data.status) card.setAttribute('data-status', data.status.toLowerCase());
                });

                // ── Patch dashboard #establishmentStatus badge ───────────────
                // (only present on the owner dashboard page)
                const dashBadge = document.getElementById('establishmentStatus');
                if (dashBadge && data.opening_24h) {
                    dashBadge.setAttribute('data-opening-time', data.opening_24h);
                    dashBadge.setAttribute('data-closing-time', data.closing_24h);
                }

                // ── ✅ FIX: Patch navbarStatusBadge (dashboard top bar) ───────
                // updateHeroStatus() uses navbarStatusBadge as the primary time
                // source. Without this patch, BroadcastChannel syncs and the
                // status_updater init call left navbarStatusBadge with stale/empty
                // data-opening-time → calcStatus('','') returned 'Closed'.
                // ✅ FIX v2: Only overwrite closing-time when the API returns a
                //    non-empty value. Previously data.closing_24h || '' could set
                //    data-closing-time to '' — causing the 60-second setInterval
                //    updateHeroStatus() to call calcStatus(validOpen, '') = 'Closed',
                //    creating a repeated flash every minute.
                // NOTE: data-force-status is set to 'open' always here so that
                // Section 8 of updateAllClientStatuses() uses schedule-based
                // calculation and the navbar shows Open/Closed from today's hours.
                const _navBadge = document.getElementById('navbarStatusBadge');
                if (_navBadge && data.opening_24h) {
                    _navBadge.setAttribute('data-opening-time', data.opening_24h);
                    if (data.closing_24h) _navBadge.setAttribute('data-closing-time', data.closing_24h);
                    // Always 'open' so the schedule-based calc runs (not force-Closed override)
                    _navBadge.setAttribute('data-force-status', 'open');
                }

                // ── Patch hero card status badge + hours text (owner dashboard) ──
                const heroStatusBadge = document.getElementById('heroStatusBadge');
                if (heroStatusBadge && data.opening_24h) {
                    heroStatusBadge.setAttribute('data-opening-time', data.opening_24h);
                    // ✅ FIX: Only overwrite closing-time when non-empty (same as navbarStatusBadge fix)
                    if (data.closing_24h) heroStatusBadge.setAttribute('data-closing-time', data.closing_24h);
                    // Only lock to 'disabled' when owner manually toggled the store off;
                    // otherwise always use 'open' so time-based calc runs correctly.
                    const serverStatus = (data.status || '').toLowerCase();
                    heroStatusBadge.setAttribute('data-force-status',
                        (serverStatus === 'disabled') ? 'disabled' : 'open'
                    );
                }

                // ── Update the displayed hours text (e.g. "8:00 AM – 5:00 PM") ──
                const heroHoursText = document.getElementById('heroHoursText');
                const heroHoursSep  = document.getElementById('heroHoursSep');
                if (heroHoursText && data.opening_time && data.closing_time) {
                    heroHoursText.textContent = data.opening_time + ' \u2013 ' + data.closing_time;
                    heroHoursText.style.display = '';   // reveal if it was hidden
                    if (heroHoursSep) heroHoursSep.style.display = '';
                }

                // ── Also sync the NAVBAR hours text so it always matches today's schedule ──
                const navHoursText = document.getElementById('navbarHoursText');
                const navHoursSep  = document.getElementById('navbarHoursSep');
                if (navHoursText && data.opening_time && data.closing_time) {
                    navHoursText.textContent = data.opening_time + ' \u2013 ' + data.closing_time;
                    navHoursText.style.display = '';
                    if (navHoursSep) navHoursSep.style.display = '';
                }

                // ── Re-run badge calculation with the fresh times ───────────
                updateAllClientStatuses();

                // ── Patch weekly hours grid if visible (unlikely outside details) ──
                if (typeof updateWeeklyHoursFromBackend === 'function' &&
                    data.weekly_hours && Array.isArray(data.weekly_hours)) {
                    updateWeeklyHoursFromBackend(data.weekly_hours, data.today_weekday, data.status);
                }

                console.log('✅ [StatusUpdater] Patched est #' + estId + ' from broadcast');
            })
            .catch(function (err) {
                console.warn('[StatusUpdater] _fetchAndPatchEstCard failed:', err.message);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();