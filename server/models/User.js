const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    cart: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            default: 1
        }
    }],
    // Loyalty Badge System
    loyaltyBadge: {
        type: {
            type: String,
            enum: ['none', 'silver', 'gold', 'platinum'],
            default: 'none'
        },
        purchasedAt: {
            type: Date
        },
        expiresAt: {
            type: Date
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        }
    },
    // Wallet Cash System
    walletBalance: {
        type: Number,
        default: 0
    },
    walletHistory: [{
        type: {
            type: String,
            enum: ['topup', 'purchase', 'refund', 'deposit', 'withdraw', 'friend_payment'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        description: String,
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        friendId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Delivery Location (from map picker)
    deliveryLocation: {
        address: String,
        coordinates: {
            lat: Number,
            lng: Number
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    // Password Reset
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);