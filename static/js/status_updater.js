// Real-time Status Updater - Paste this ENTIRE code
(function() {
    'use strict';

    function getCurrentMinutes() {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }

    function calculateStatus(openingTime, closingTime) {
        if (!openingTime || !closingTime) return "Closed";

        const currentMinutes = getCurrentMinutes();

        const [openHour, openMin] = openingTime.split(':').map(Number);
        const openingMinutes = openHour * 60 + openMin;

        const [closeHour, closeMin] = closingTime.split(':').map(Number);
        const closingMinutes = closeHour * 60 + closeMin;

        // Overnight hours (e.g., 22:00 - 02:00)
        if (openingMinutes > closingMinutes) {
            return (currentMinutes >= openingMinutes || currentMinutes <= closingMinutes) ? "Open" : "Closed";
        }

        // Normal hours (e.g., 08:00 - 22:00)
        return (currentMinutes >= openingMinutes && currentMinutes <= closingMinutes) ? "Open" : "Closed";
    }

    function updateStatusElement(element, status) {
        const isOpen = status === "Open";

        // Update classes
        element.classList.remove('open', 'closed', 'status-open', 'status-closed');
        element.classList.add(isOpen ? 'open' : 'closed');
        element.classList.add(isOpen ? 'status-open' : 'status-closed');

        // Update text content
        const statusText = element.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = status;
        } else if (!element.innerHTML.includes('<')) {
            element.textContent = isOpen ? "âœ… Open Now" : "ðŸ"' Closed Now";
        } else {
            element.innerHTML = isOpen ? "âœ… Open Now" : "ðŸ"' Closed Now";
        }

        // Update dot color if exists
        const dot = element.querySelector('.dot');
        if (dot) {
            dot.style.backgroundColor = isOpen ? '#4caf50' : '#f44336';
        }
    }

    function updateAllStatuses() {
        // Update main page cards
        document.querySelectorAll('.food-establishment-item').forEach(item => {
            const statusIndicator = item.querySelector('.status-indicator');
            if (!statusIndicator) return;

            const openingTime = item.dataset.openingTime || statusIndicator.dataset.openingTime;
            const closingTime = item.dataset.closingTime || statusIndicator.dataset.closingTime;

            if (!openingTime || !closingTime) return;

            const newStatus = calculateStatus(openingTime, closingTime);
            updateStatusElement(statusIndicator, newStatus);
        });

        // Update detail page badge
        const detailBadge = document.getElementById('detailStatusBadge');
        if (detailBadge) {
            const openingTime = detailBadge.dataset.openingTime;
            const closingTime = detailBadge.dataset.closingTime;

            if (openingTime && closingTime) {
                const newStatus = calculateStatus(openingTime, closingTime);
                updateStatusElement(detailBadge, newStatus);
            }
        }

        // Update dashboard badge
        const dashboardBadge = document.getElementById('establishmentStatus');
        if (dashboardBadge) {
            const openingTime = dashboardBadge.dataset.openingTime;
            const closingTime = dashboardBadge.dataset.closingTime;

            if (openingTime && closingTime) {
                const newStatus = calculateStatus(openingTime, closingTime);
                updateStatusElement(dashboardBadge, newStatus);
            }
        }

        console.log('âœ… Status updated:', new Date().toLocaleTimeString());
    }

    // Initialize
    function init() {
        updateAllStatuses();
        setInterval(updateAllStatuses, 60000); // Every 60 seconds

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) updateAllStatuses();
        });

        console.log('ðŸ"„ Real-time status updater started');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();