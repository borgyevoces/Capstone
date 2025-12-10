// ============================================================
// ✅ FIXED: Real-time Status Updater for KabsuEats
// ============================================================

(function() {
    'use strict';

    /**
     * Get current time in minutes since midnight
     */
    function getCurrentMinutes() {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }

    /**
     * Convert "HH:MM" string to minutes since midnight
     */
    function timeToMinutes(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') {
            console.error('Invalid time string:', timeStr);
            return null;
        }

        const parts = timeStr.trim().split(':');
        if (parts.length !== 2) {
            console.error('Invalid time format:', timeStr);
            return null;
        }

        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);

        if (isNaN(hours) || isNaN(minutes)) {
            console.error('Invalid time values:', timeStr);
            return null;
        }

        return hours * 60 + minutes;
    }

    /**
     * Calculate if establishment is Open or Closed
     */
    function calculateStatus(openingTime, closingTime) {
        if (!openingTime || !closingTime) {
            console.warn('Missing opening or closing time');
            return "Closed";
        }

        const currentMinutes = getCurrentMinutes();
        const openingMinutes = timeToMinutes(openingTime);
        const closingMinutes = timeToMinutes(closingTime);

        if (openingMinutes === null || closingMinutes === null) {
            console.error('Failed to parse times:', { openingTime, closingTime });
            return "Closed";
        }

        // 🕐 Normal hours (e.g., 08:00 - 22:00)
        if (openingMinutes <= closingMinutes) {
            const isOpen = currentMinutes >= openingMinutes && currentMinutes <= closingMinutes;
            return isOpen ? "Open" : "Closed";
        }

        // 🌙 Overnight hours (e.g., 22:00 - 02:00)
        const isOpen = currentMinutes >= openingMinutes || currentMinutes <= closingMinutes;
        return isOpen ? "Open" : "Closed";
    }

    /**
     * Update status element (badge/indicator)
     */
    function updateStatusElement(element, status) {
        if (!element) return;

        const isOpen = status === "Open";

        // Update classes
        element.classList.remove('open', 'closed', 'status-open', 'status-closed');
        element.classList.add(isOpen ? 'open' : 'closed');
        element.classList.add(isOpen ? 'status-open' : 'status-closed');

        // Update text content
        const statusText = element.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = status;
        } else {
            // For badges without .status-text
            if (element.innerHTML.includes('✅') || element.innerHTML.includes('🔒')) {
                element.innerHTML = isOpen ? "✅ Open Now" : "🔒 Closed Now";
            } else {
                element.textContent = isOpen ? "Open Now" : "Closed Now";
            }
        }

        // Update dot color if exists
        const dot = element.querySelector('.dot');
        if (dot) {
            dot.style.backgroundColor = isOpen ? '#4caf50' : '#f44336';
        }
    }

    /**
     * Update all status elements on the page
     */
    function updateAllStatuses() {
        let updated = 0;

        // 1️⃣ Update main page establishment cards
        document.querySelectorAll('.food-establishment-item').forEach(item => {
            const statusIndicator = item.querySelector('.status-indicator');
            if (!statusIndicator) return;

            const openingTime = item.dataset.openingTime || statusIndicator.dataset.openingTime;
            const closingTime = item.dataset.closingTime || statusIndicator.dataset.closingTime;

            if (!openingTime || !closingTime) {
                console.warn('Missing time data for establishment card');
                return;
            }

            const newStatus = calculateStatus(openingTime, closingTime);
            updateStatusElement(statusIndicator, newStatus);
            updated++;
        });

        // 2️⃣ Update detail page badge
        const detailBadge = document.getElementById('detailStatusBadge');
        if (detailBadge) {
            const openingTime = detailBadge.dataset.openingTime;
            const closingTime = detailBadge.dataset.closingTime;

            if (openingTime && closingTime) {
                const newStatus = calculateStatus(openingTime, closingTime);
                updateStatusElement(detailBadge, newStatus);
                updated++;

                console.log('📍 Detail Page Status Update:', {
                    opening: openingTime,
                    closing: closingTime,
                    currentTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    status: newStatus
                });
            }
        }

        // 3️⃣ Update dashboard badge
        const dashboardBadge = document.getElementById('establishmentStatus');
        if (dashboardBadge) {
            const openingTime = dashboardBadge.dataset.openingTime;
            const closingTime = dashboardBadge.dataset.closingTime;

            if (openingTime && closingTime) {
                const newStatus = calculateStatus(openingTime, closingTime);
                updateStatusElement(dashboardBadge, newStatus);
                updated++;

                console.log('📍 Dashboard Status Update:', {
                    opening: openingTime,
                    closing: closingTime,
                    currentTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    status: newStatus
                });
            }
        }

        if (updated > 0) {
            console.log(`✅ Updated ${updated} status element(s) at ${new Date().toLocaleTimeString()}`);
        }
    }

    /**
     * Initialize real-time updater
     */
    function init() {
        console.log('🔄 Real-time status updater initializing...');

        // Update immediately
        updateAllStatuses();

        // Update every 60 seconds
        setInterval(updateAllStatuses, 60000);

        // Update when page becomes visible again
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Page visible again - updating status');
                updateAllStatuses();
            }
        });

        console.log('✅ Real-time status updater started');
    }

    // Auto-start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();