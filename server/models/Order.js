const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        image: String
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'packed', 'assigned', 'out_for_delivery', 'delivered', 'cancelled', 'holding'],
        default: 'pending'
    },
    holdingReason: {
        type: String,
        default: null
    },
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        message: String,
        updatedBy: String
    }],
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'online', 'wallet', 'friend_wallet'],
        default: 'cod'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    deliveredDate: Date,
    // Tracking fields
    deliveryPartner: {
        partnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DeliveryPartner'
        },
        name: String,
        phone: String,
        vehicle: String,
        currentLocation: {
            lat: Number,
            lng: Number,
            timestamp: Date
        }
    },
    estimatedDeliveryTime: Date,
    deliveryInstructions: String,
    deliveryRating: {
        overall: {
            type: Number,
            min: 1,
            max: 5
        },
        packaging: {
            type: Number,
            min: 1,
            max: 5
        },
        freshness: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        ratedAt: Date
    },
    // Enhanced Route Tracking
    packagingPoint: {
        name: String,
        address: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    routeWaypoints: [{
        name: {
            type: String,
            required: true
        },
        address: String,
        pincode: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        order: {
            type: Number,
            default: 0
        },
        reached: {
            type: Boolean,
            default: false
        },
        reachedAt: Date
    }],
    deliveryTiming: {
        estimatedMinutes: Number,
        membershipType: {
            type: String,
            enum: ['none', 'silver', 'gold', 'platinum'],
            default: 'none'
        },
        expressDelivery: {
            type: Boolean,
            default: false
        },
        expressDeliveryCharge: {
            type: Number,
            default: 0
        }
    },
    // Hub-based delivery system
    assignedHub: {
        id: String,
        name: String,
        location: {
            lat: Number,
            lng: Number
        },
        distance: Number, // Distance from customer in km
        hubDistance: Number // Calculated distance for validation
    },
    estimatedDeliveryMinutes: Number, // Generated once based on membership
    deliveryStartTime: Date, // When delivery partner is assigned
    expectedArrivalTime: Date, // deliveryStartTime + estimatedDeliveryMinutes
    // User's pinned delivery location (exact coordinates from map)
    deliveryLocation: {
        coordinates: {
            lat: Number,
            lng: Number
        },
        address: String
    },
    route: {
        origin: {
            lat: Number,
            lng: Number
        },
        destination: {
            lat: Number,
            lng: Number
        },
        distance: String,
        duration: String
    },
    // Delivery Progress Tracking
    deliveryProgress: {
        startTime: {
            type: Date
        },
        estimatedDeliveryMinutes: {
            type: Number
        },
        currentProgress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        lastUpdated: {
            type: Date
        },
        completedAt: {
            type: Date
        }
    },
    // Cancellation fields
    cancelledAt: Date,
    cancellationReason: String
});

module.exports = mongoose.model('Order', orderSchema);