// Geocoding utility using OpenStreetMap Nominatim
const axios = require('axios');

/**
 * Geocode an address to coordinates using Nominatim
 * @param {string} address - The address to geocode
 * @returns {Promise<{lat: number, lng: number}>} - Coordinates
 */
async function geocodeAddress(address) {
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: address,
                format: 'json',
                limit: 1
            },
            headers: {
                'User-Agent': 'ExpressBasket/1.0'
            }
        });

        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            };
        }

        throw new Error('Address not found');
    } catch (error) {
        console.error('Geocoding error:', error.message);
        throw new Error('Failed to geocode address');
    }
}

/**
 * Calculate delivery time based on membership type
 * @param {string} membershipType - User's membership type
 * @param {boolean} expressDelivery - Whether express delivery is selected
 * @returns {{estimatedMinutes: number, expressCharge: number}}
 */
function calculateDeliveryTime(membershipType = 'none', expressDelivery = false) {
    const timings = {
        'none': { min: 25, max: 30, express: null, charge: 0 },
        'silver': { min: 20, max: 25, express: null, charge: 0 },
        'gold': { min: 20, max: 25, express: 16, charge: 10 },
        'platinum': { min: 10, max: 12, express: null, charge: 0 }
    };

    const timing = timings[membershipType] || timings['none'];

    // Platinum members always get fast delivery
    if (membershipType === 'platinum') {
        return {
            estimatedMinutes: timing.max,
            expressCharge: 0
        };
    }

    // Gold members can opt for express
    if (membershipType === 'gold' && expressDelivery && timing.express) {
        return {
            estimatedMinutes: timing.express,
            expressCharge: timing.charge
        };
    }

    // Default to max time for normal delivery
    return {
        estimatedMinutes: timing.max,
        expressCharge: 0
    };
}

/**
 * Predefined packaging points/warehouses across India
 */
const packagingPoints = [
    // North India
    {
        name: 'Delhi NCR Hub',
        address: 'New Delhi, Delhi',
        pincode: '110001',
        coordinates: { lat: 28.6139, lng: 77.2090 }
    },
    {
        name: 'Gurgaon Distribution Center',
        address: 'Gurgaon, Haryana',
        pincode: '122001',
        coordinates: { lat: 28.4595, lng: 77.0266 }
    },
    {
        name: 'Chandigarh Warehouse',
        address: 'Chandigarh',
        pincode: '160001',
        coordinates: { lat: 30.7333, lng: 76.7794 }
    },
    // West India
    {
        name: 'Mumbai Central Hub',
        address: 'Mumbai, Maharashtra',
        pincode: '400001',
        coordinates: { lat: 19.0760, lng: 72.8777 }
    },
    {
        name: 'Pune Distribution Center',
        address: 'Pune, Maharashtra',
        pincode: '411001',
        coordinates: { lat: 18.5204, lng: 73.8567 }
    },
    {
        name: 'Ahmedabad Warehouse',
        address: 'Ahmedabad, Gujarat',
        pincode: '380001',
        coordinates: { lat: 23.0225, lng: 72.5714 }
    },
    // South India
    {
        name: 'Bangalore Tech Hub',
        address: 'Bangalore, Karnataka',
        pincode: '560001',
        coordinates: { lat: 12.9716, lng: 77.5946 }
    },
    {
        name: 'Chennai Distribution Center',
        address: 'Chennai, Tamil Nadu',
        pincode: '600001',
        coordinates: { lat: 13.0827, lng: 80.2707 }
    },
    {
        name: 'Hyderabad Warehouse',
        address: 'Hyderabad, Telangana',
        pincode: '500001',
        coordinates: { lat: 17.3850, lng: 78.4867 }
    },
    {
        name: 'Kochi Hub',
        address: 'Kochi, Kerala',
        pincode: '682001',
        coordinates: { lat: 9.9312, lng: 76.2673 }
    },
    // East India
    {
        name: 'Kolkata Main Warehouse',
        address: 'Kolkata, West Bengal',
        pincode: '700001',
        coordinates: { lat: 22.5726, lng: 88.3639 }
    },
    {
        name: 'Howrah Distribution Center',
        address: 'Howrah, West Bengal',
        pincode: '711101',
        coordinates: { lat: 22.5958, lng: 88.2636 }
    },
    {
        name: 'Bhubaneswar Hub',
        address: 'Bhubaneswar, Odisha',
        pincode: '751001',
        coordinates: { lat: 20.2961, lng: 85.8245 }
    },
    // Central India
    {
        name: 'Nagpur Distribution Center',
        address: 'Nagpur, Maharashtra',
        pincode: '440001',
        coordinates: { lat: 21.1458, lng: 79.0882 }
    },
    {
        name: 'Indore Warehouse',
        address: 'Indore, Madhya Pradesh',
        pincode: '452001',
        coordinates: { lat: 22.7196, lng: 75.8577 }
    },
    // Northeast India
    {
        name: 'Guwahati Hub',
        address: 'Guwahati, Assam',
        pincode: '781001',
        coordinates: { lat: 26.1445, lng: 91.7362 }
    }
];

module.exports = {
    geocodeAddress,
    calculateDeliveryTime,
    packagingPoints
};
