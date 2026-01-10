// Hub Selection Utility
// Finds nearest hub within 30km of customer location and generates delivery time

const HUBS = [
    { id: 'kolkata', name: 'Kolkata Hub', lat: 22.5726, lng: 88.3639 },
    { id: 'delhi', name: 'Delhi Hub', lat: 28.6139, lng: 77.2090 },
    { id: 'mumbai', name: 'Mumbai Hub', lat: 19.0760, lng: 72.8777 },
    { id: 'bangalore', name: 'Bangalore Hub', lat: 12.9716, lng: 77.5946 }
];

const MAX_DELIVERY_RADIUS_KM = 30;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Find nearest hub within 30km of customer location
 * @param {object} customerLocation - { lat, lng }
 * @returns {object|null} Hub object or null if none within 30km
 */
function findNearestHub(customerLocation) {
    if (!customerLocation || !customerLocation.lat || !customerLocation.lng) {
        return null;
    }

    let nearestHub = null;
    let minDistance = Infinity;

    for (const hub of HUBS) {
        const distance = calculateDistance(
            customerLocation.lat,
            customerLocation.lng,
            hub.lat,
            hub.lng
        );

        if (distance <= MAX_DELIVERY_RADIUS_KM && distance < minDistance) {
            minDistance = distance;
            nearestHub = {
                ...hub,
                distance: Math.round(distance * 10) / 10 // Round to 1 decimal
            };
        }
    }

    return nearestHub;
}

/**
 * Generate delivery time based on membership tier
 * Time is random within tier range and generated ONCE per order
 * @param {string} membershipTier - 'platinum', 'gold', 'silver', or 'none'
 * @returns {number} Delivery time in minutes
 */
function generateDeliveryTime(membershipTier) {
    const timeRanges = {
        'platinum': [10, 15],
        'gold': [15, 20],
        'silver': [20, 25],
        'none': [25, 30]
    };

    const tier = (membershipTier || 'none').toLowerCase();
    const [min, max] = timeRanges[tier] || timeRanges['none'];

    // Generate random time within range
    const deliveryMinutes = Math.floor(Math.random() * (max - min + 1)) + min;

    return deliveryMinutes;
}

/**
 * Calculate expected arrival time
 * @param {Date} startTime - When delivery started
 * @param {number} deliveryMinutes - Estimated delivery time in minutes
 * @returns {Date} Expected arrival time
 */
function calculateExpectedArrival(startTime, deliveryMinutes) {
    const arrivalTime = new Date(startTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + deliveryMinutes);
    return arrivalTime;
}

module.exports = {
    HUBS,
    MAX_DELIVERY_RADIUS_KM,
    calculateDistance,
    findNearestHub,
    generateDeliveryTime,
    calculateExpectedArrival
};
