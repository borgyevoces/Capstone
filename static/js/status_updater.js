// ============================================================
// REAL-TIME STATUS UPDATER FOR KABSUEATS
// Add this to kabsueats.js or create separate status_updater.js
// ============================================================

/**
 * Calculate if establishment is Open or Closed based on opening/closing times
 * @param {string} openingTime - Format: "HH:MM" (24-hour)
 * @param {string} closingTime - Format: "HH:MM" (24-hour)
 * @returns {string} - "Open" or "Closed"
 */
function calculateStatus(openingTime, closingTime) {
    if (!openingTime || !closingTime) {
        return "Closed";
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Parse opening time
    const [openHour, openMin] = openingTime.split(':').map(Number);
    const openingMinutes = openHour * 60 + openMin;

    // Parse closing time
    const [closeHour, closeMin] = closingTime.split(':').map(Number);
    const closingMinutes = closeHour * 60 + closeMin;

    // Handle overnight hours (e.g., 10 PM - 2 AM)
    if (openingMinutes > closingMinutes) {
        // If current time is after opening OR before closing
        return (currentMinutes >= openingMinutes || currentMinutes <= closingMinutes) ? "Open" : "Closed";
    } else {
        // Normal hours (e.g., 8 AM - 10 PM)
        return (currentMinutes >= openingMinutes && currentMinutes <= closingMinutes) ? "Open" : "Closed";
    }
}

/**
 * Update status badge element
 * @param {HTMLElement} statusElement - The status badge/indicator element
 * @param {string} status - "Open" or "Closed"
 */
function updateStatusBadge(statusElement, status) {
    if (!statusElement) return;

    // Update text
    const isOpen = status === "Open";
    statusElement.textContent = isOpen ? "Open Now" : "Closed Now";

    // Update classes
    statusElement.classList.remove('status-open', 'status-closed', 'open', 'closed');
    statusElement.classList.add(isOpen ? 'status-open' : 'status-closed');
    statusElement.classList.add(isOpen ? 'open' : 'closed');

    // Update icon
    const iconHTML = isOpen ? 'âœ… Open Now' : 'ðŸ"' Closed Now';
    statusElement.innerHTML = iconHTML;
}

/**
 * Update all establishment status indicators on the page
 */
function updateAllEstablishmentStatuses() {
    // Update main page establishment cards
    const establishments = document.querySelectorAll('.food-establishment-item');

    establishments.forEach(item => {
        const statusIndicator = item.querySelector('.status-indicator');
        if (!statusIndicator) return;

        // Get opening/closing times from data attributes
        const openingTime = item.dataset.openingTime;
        const closingTime = item.dataset.closingTime;

        if (!openingTime || !closingTime) return;

        const newStatus = calculateStatus(openingTime, closingTime);

        // Update badge
        statusIndicator.classList.remove('open', 'closed');
        statusIndicator.classList.add(newStatus.toLowerCase());

        const dot = statusIndicator.querySelector('.dot');
        const text = statusIndicator.querySelector('span:not(.dot)') || statusIndicator;

        if (newStatus === "Open") {
            text.textContent = "Open";
            if (dot) dot.style.backgroundColor = '#4caf50';
        } else {
            text.textContent = "Closed";
            if (dot) dot.style.backgroundColor = '#f44336';
        }
    });

    // Update detail page status badge
    const detailStatusBadge = document.getElementById('establishmentStatus') ||
                              document.querySelector('.status-badge');

    if (detailStatusBadge) {
        const openingTime = detailStatusBadge.dataset.openingTime;
        const closingTime = detailStatusBadge.dataset.closingTime;

        if (openingTime && closingTime) {
            const newStatus = calculateStatus(openingTime, closingTime);
            updateStatusBadge(detailStatusBadge, newStatus);
        }
    }

    console.log('âœ… Status updated at', new Date().toLocaleTimeString());
}

/**
 * Initialize real-time status updater
 * Updates every minute to keep status current
 */
function initRealtimeStatusUpdater() {
    // Update immediately on page load
    updateAllEstablishmentStatuses();

    // Update every 60 seconds (1 minute)
    setInterval(updateAllEstablishmentStatuses, 60000);

    // Also update when page becomes visible again (user switches tabs)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateAllEstablishmentStatuses();
        }
    });

    console.log('ðŸ"„ Real-time status updater initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRealtimeStatusUpdater);
} else {
    initRealtimeStatusUpdater();
}

// Export for use in other scripts
window.updateEstablishmentStatuses = updateAllEstablishmentStatuses;
window.calculateEstablishmentStatus = calculateStatus;