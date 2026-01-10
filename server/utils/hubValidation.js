/**
 * Hub Validation and Distance Calculation Utilities
 * Handles hub distance validation and order status management
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @returns {Number} Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2 || !coord1.lat || !coord1.lng || !coord2.lat || !coord2.lng) {
        return null;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(coord2.lat - coord1.lat);
    const dLng = toRadians(coord2.lng - coord1.lng);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(coord1.lat)) *
        Math.cos(toRadians(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 * @param {Number} degrees
 * @returns {Number} Radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Validate if hub is within acceptable distance from customer
 * @param {Object} hubCoords - Hub coordinates {lat, lng}
 * @param {Object} customerCoords - Customer coordinates {lat, lng}
 * @param {Number} maxDistanceKm - Maximum acceptable distance (default: 40km)
 * @returns {Object} {isValid: boolean, distance: number, reason: string}
 */
function validateHubDistance(hubCoords, customerCoords, maxDistanceKm = 40) {
    const distance = calculateDistance(hubCoords, customerCoords);

    if (distance === null) {
        return {
            isValid: false,
            distance: null,
            reason: 'Unable to calculate distance - invalid coordinates'
        };
    }

    if (distance > maxDistanceKm) {
        return {
            isValid: false,
            distance,
            reason: `Customer location is ${distance}km away from nearest hub (max: ${maxDistanceKm}km)`
        };
    }

    return {
        isValid: true,
        distance,
        reason: null
    };
}

/**
 * Determine if order should be set to holding status
 * @param {Object} order - Order object with assignedHub and shipping address
 * @returns {Object} {shouldHold: boolean, reason: string, distance: number}
 */
function shouldSetHoldingStatus(order) {
    if (!order.assignedHub || !order.assignedHub.location) {
        return {
            shouldHold: true,
            reason: 'No delivery hub available',
            distance: null
        };
    }

    if (!order.shippingAddress?.coordinates && !order.deliveryLocation?.coordinates) {
        return {
            shouldHold: true,
            reason: 'Customer location not available',
            distance: null
        };
    }

    const customerCoords = order.deliveryLocation?.coordinates || order.shippingAddress?.coordinates;
    const hubCoords = order.assignedHub.location;

    const validation = validateHubDistance(hubCoords, customerCoords);

    if (!validation.isValid) {
        return {
            shouldHold: true,
            reason: validation.reason,
            distance: validation.distance
        };
    }

    return {
        shouldHold: false,
        reason: null,
        distance: validation.distance
    };
}

/**
 * Get user-friendly distance message
 * @param {Number} distance - Distance in kilometers
 * @returns {String} Formatted message
 */
function getDistanceMessage(distance) {
    if (distance === null) {
        return 'Distance unavailable';
    }

    if (distance < 1) {
        return `${Math.round(distance * 1000)}m away`;
    }

    return `${distance}km away`;
}

module.exports = {
    calculateDistance,
    validateHubDistance,
    shouldSetHoldingStatus,
    getDistanceMessage
};
