// Map helper utilities

/**
 * Get user's current location
 * @returns {Promise<{lat: number, lng: number}>}
 */
export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    });
};

/**
 * Calculate distance between two points using Haversine formula
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {Number} Distance in meters
 */
export const calculateDistance = (point1, point2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Get map bounds that include all points
 * @param {Array} points - Array of {lat, lng} objects
 * @returns {Array} [[minLat, minLng], [maxLat, maxLng]]
 */
export const getBounds = (points) => {
    if (!points || points.length === 0) return null;

    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);

    return [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
    ];
};

/**
 * Default map center (India)
 */
export const DEFAULT_CENTER = {
    lat: 20.5937,
    lng: 78.9629
};

/**
 * Default zoom level
 */
export const DEFAULT_ZOOM = 5;

/**
 * City zoom level
 */
export const CITY_ZOOM = 12;

/**
 * Street zoom level
 */
export const STREET_ZOOM = 16;

/**
 * Get marker color based on order status
 * @param {String} status - Order status
 * @returns {String} Color hex code
 */
export const getMarkerColor = (status) => {
    const colors = {
        pending: '#FFA500',      // Orange
        confirmed: '#2196F3',    // Blue
        preparing: '#9C27B0',    // Purple
        'out-for-delivery': '#FF9800', // Deep Orange
        delivered: '#4CAF50',    // Green
        cancelled: '#F44336'     // Red
    };
    return colors[status] || '#757575'; // Grey default
};

/**
 * Create custom marker icon HTML
 * @param {String} color - Marker color
 * @param {String} icon - Icon name or emoji
 * @returns {String} HTML string
 */
export const createMarkerIcon = (color, icon = '📍') => {
    return `
    <div style="
      background: ${color};
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 20px;
      ">${icon}</span>
    </div>
  `;
};

/**
 * Validate coordinates
 * @param {Number} lat - Latitude
 * @param {Number} lng - Longitude
 * @returns {Boolean}
 */
export const isValidCoordinates = (lat, lng) => {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
};
