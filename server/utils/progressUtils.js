/**
 * Delivery Progress Calculation Utilities
 * Handles real-time progress tracking for orders out for delivery
 */

/**
 * Calculate current delivery progress percentage
 * @param {Date} startTime - When delivery started
 * @param {Number} estimatedMinutes - Estimated delivery time in minutes
 * @returns {Number} Progress percentage (0-100)
 */
function calculateDeliveryProgress(startTime, estimatedMinutes) {
    if (!startTime || !estimatedMinutes) {
        return 0;
    }

    const now = new Date();
    const elapsedMs = now - new Date(startTime);
    const elapsedMinutes = elapsedMs / (1000 * 60);

    // Calculate raw progress
    let progress = (elapsedMinutes / estimatedMinutes) * 100;

    // Allow progress to reach 100% when time is up
    // Progress will continue beyond 100% if delivery is delayed

    // Ensure progress is at least 0
    return Math.max(0, Math.round(progress));
}

/**
 * Get estimated arrival time
 * @param {Date} startTime - When delivery started
 * @param {Number} estimatedMinutes - Estimated delivery time in minutes
 * @returns {Date} Estimated arrival time
 */
function getEstimatedArrivalTime(startTime, estimatedMinutes) {
    if (!startTime || !estimatedMinutes) {
        return null;
    }

    const arrival = new Date(startTime);
    arrival.setMinutes(arrival.getMinutes() + estimatedMinutes);
    return arrival;
}

/**
 * Get remaining time in minutes
 * @param {Date} startTime - When delivery started
 * @param {Number} estimatedMinutes - Estimated delivery time in minutes
 * @returns {Number} Remaining minutes (can be negative if delayed)
 */
function getRemainingMinutes(startTime, estimatedMinutes) {
    if (!startTime || !estimatedMinutes) {
        return 0;
    }

    const now = new Date();
    const elapsedMs = now - new Date(startTime);
    const elapsedMinutes = elapsedMs / (1000 * 60);

    return Math.round(estimatedMinutes - elapsedMinutes);
}

/**
 * Format remaining time as human-readable string
 * @param {Number} remainingMinutes - Minutes remaining
 * @returns {String} Formatted time string
 */
function formatRemainingTime(remainingMinutes) {
    if (remainingMinutes <= 0) {
        return 'Arriving now';
    }

    if (remainingMinutes < 1) {
        return 'Less than a minute';
    }

    if (remainingMinutes === 1) {
        return '1 minute';
    }

    return `${remainingMinutes} minutes`;
}

/**
 * Get progress status message based on percentage
 * @param {Number} progress - Progress percentage (0-100)
 * @returns {String} Status message
 */
function getProgressMessage(progress) {
    if (progress === 0) {
        return 'Starting delivery';
    } else if (progress < 25) {
        return 'Just started';
    } else if (progress < 50) {
        return 'On the way';
    } else if (progress < 75) {
        return 'Halfway there';
    } else if (progress < 90) {
        return 'Almost there';
    } else if (progress < 95) {
        return 'Arriving soon';
    } else {
        return 'Arriving now';
    }
}

/**
 * Get progress color based on percentage
 * @param {Number} progress - Progress percentage (0-100)
 * @returns {String} Color code
 */
function getProgressColor(progress) {
    if (progress < 25) {
        return '#3b82f6'; // Blue
    } else if (progress < 50) {
        return '#06b6d4'; // Cyan
    } else if (progress < 75) {
        return '#f59e0b'; // Orange
    } else if (progress < 95) {
        return '#10b981'; // Green
    } else {
        return '#eab308'; // Gold
    }
}

/**
 * Check if delivery is delayed
 * @param {Date} startTime - When delivery started
 * @param {Number} estimatedMinutes - Estimated delivery time in minutes
 * @returns {Boolean} True if delayed
 */
function isDeliveryDelayed(startTime, estimatedMinutes) {
    const remaining = getRemainingMinutes(startTime, estimatedMinutes);
    return remaining < 0;
}

/**
 * Get complete progress info
 * @param {Date} startTime - When delivery started
 * @param {Number} estimatedMinutes - Estimated delivery time in minutes
 * @returns {Object} Complete progress information
 */
function getProgressInfo(startTime, estimatedMinutes) {
    const progress = calculateDeliveryProgress(startTime, estimatedMinutes);
    const remainingMinutes = getRemainingMinutes(startTime, estimatedMinutes);
    const eta = getEstimatedArrivalTime(startTime, estimatedMinutes);

    return {
        progress,
        remainingMinutes,
        remainingTime: formatRemainingTime(remainingMinutes),
        eta,
        message: getProgressMessage(progress),
        color: getProgressColor(progress),
        isDelayed: isDeliveryDelayed(startTime, estimatedMinutes)
    };
}

module.exports = {
    calculateDeliveryProgress,
    getEstimatedArrivalTime,
    getRemainingMinutes,
    formatRemainingTime,
    getProgressMessage,
    getProgressColor,
    isDeliveryDelayed,
    getProgressInfo
};
