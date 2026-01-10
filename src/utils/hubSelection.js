// Hub Selection Utility for Frontend
// Client-side version of hub selection logic

const HUBS = [
    { id: 'kolkata', name: 'Kolkata Hub', lat: 22.5726, lng: 88.3639 },
    { id: 'delhi', name: 'Delhi Hub', lat: 28.6139, lng: 77.2090 },
    { id: 'mumbai', name: 'Mumbai Hub', lat: 19.0760, lng: 72.8777 },
    { id: 'bangalore', name: 'Bangalore Hub', lat: 12.9716, lng: 77.5946 }
];

const MAX_DELIVERY_RADIUS_KM = 30;

/**
 * Calculate distance between two coordinates using Haversine formula
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
 */
export function findNearestHub(customerLocation) {
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

export { HUBS, MAX_DELIVERY_RADIUS_KM };
