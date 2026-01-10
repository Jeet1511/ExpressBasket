// OpenRouteService API integration
import axios from 'axios';

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || '5b3ce3597851110001cf6248a3c6e3f1b4c84f5c8e7e8e8e8e8e8e8e'; // Free demo key

const ORS_BASE_URL = 'https://api.openrouteservice.org';

/**
 * Calculate route between two or more points
 * @param {Array} coordinates - Array of [lng, lat] pairs
 * @param {String} profile - 'driving-car', 'cycling-regular', 'foot-walking'
 * @returns {Object} Route data with geometry, distance, duration
 */
export const calculateRoute = async (coordinates, profile = 'driving-car') => {
    try {
        const response = await axios.post(
            `${ORS_BASE_URL}/v2/directions/${profile}/geojson`,
            {
                coordinates: coordinates,
                instructions: true,
                elevation: false
            },
            {
                headers: {
                    'Authorization': ORS_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        const route = response.data.features[0];
        return {
            geometry: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert to [lat, lng]
            distance: route.properties.segments[0].distance, // in meters
            duration: route.properties.segments[0].duration, // in seconds
            steps: route.properties.segments[0].steps || []
        };
    } catch (error) {
        console.error('Error calculating route:', error);
        throw error;
    }
};

/**
 * Geocode an address to coordinates
 * @param {String} address - Address to geocode
 * @returns {Object} Coordinates and formatted address
 */
export const geocodeAddress = async (address) => {
    try {
        const response = await axios.get(
            `${ORS_BASE_URL}/geocode/search`,
            {
                params: {
                    api_key: ORS_API_KEY,
                    text: address,
                    size: 5
                }
            }
        );

        if (response.data.features.length === 0) {
            throw new Error('No results found');
        }

        const result = response.data.features[0];
        return {
            lat: result.geometry.coordinates[1],
            lng: result.geometry.coordinates[0],
            formattedAddress: result.properties.label
        };
    } catch (error) {
        console.error('Error geocoding address:', error);
        throw error;
    }
};

/**
 * Reverse geocode coordinates to address
 * @param {Number} lat - Latitude
 * @param {Number} lng - Longitude
 * @returns {String} Formatted address
 */
export const reverseGeocode = async (lat, lng) => {
    try {
        const response = await axios.get(
            `${ORS_BASE_URL}/geocode/reverse`,
            {
                params: {
                    api_key: ORS_API_KEY,
                    'point.lon': lng,
                    'point.lat': lat,
                    size: 1
                }
            }
        );

        if (response.data.features.length === 0) {
            throw new Error('No address found');
        }

        return response.data.features[0].properties.label;
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        throw error;
    }
};

/**
 * Optimize route for multiple waypoints (Traveling Salesman Problem)
 * @param {Array} waypoints - Array of {lat, lng} objects
 * @returns {Object} Optimized route with order
 */
export const optimizeRoute = async (waypoints) => {
    try {
        const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);

        const response = await axios.post(
            `${ORS_BASE_URL}/optimization`,
            {
                jobs: waypoints.map((wp, idx) => ({
                    id: idx,
                    location: [wp.lng, wp.lat]
                })),
                vehicles: [{
                    id: 1,
                    profile: 'driving-car',
                    start: coordinates[0],
                    end: coordinates[0]
                }]
            },
            {
                headers: {
                    'Authorization': ORS_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error optimizing route:', error);
        throw error;
    }
};

/**
 * Format distance for display
 * @param {Number} meters - Distance in meters
 * @returns {String} Formatted distance
 */
export const formatDistance = (meters) => {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Format duration for display
 * @param {Number} seconds - Duration in seconds
 * @returns {String} Formatted duration
 */
export const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};
