const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    approvedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    vehicle: {
        type: {
            type: String,
            enum: ['bike', 'scooter', 'car', 'van'],
            default: 'bike'
        },
        number: String
    },
    // GeoJSON location for geospatial queries
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [77.2090, 28.6139] // Default Delhi coordinates
        }
    },
    // Legacy location format (keep for compatibility)
    currentLocation: {
        lat: Number,
        lng: Number,
        timestamp: Date
    },
    socketId: {
        type: String
    },
    activeOrders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    currentDelivery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Delivery'
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    rating: {
        type: Number,
        default: 5,
        min: 1,
        max: 5
    },
    totalDeliveries: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create geospatial index for location-based queries
deliveryPartnerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
