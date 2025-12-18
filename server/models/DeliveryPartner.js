const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    vehicle: {
        type: {
            type: String,
            enum: ['bike', 'scooter', 'car', 'van'],
            default: 'bike'
        },
        number: String
    },
    currentLocation: {
        lat: Number,
        lng: Number,
        timestamp: Date
    },
    activeOrders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    isAvailable: {
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

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
