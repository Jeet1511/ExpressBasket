const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
    // User who is requesting payment
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Friend who will pay (receive the request)
    friendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Payment amount
    amount: {
        type: Number,
        required: true
    },
    // Snapshot of cart items at time of request
    cartItems: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    // Shipping address
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },
    // Request status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired', 'completed'],
        default: 'pending'
    },
    // Associated mail ID (for tracking)
    mailId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Mail'
    },
    // Order ID (created after approval)
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    // Response message from friend
    responseMessage: String,
    respondedAt: Date,
    // Auto-expire after 30 minutes
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    }
}, {
    timestamps: true
});

// Index for faster queries
paymentRequestSchema.index({ requesterId: 1, status: 1 });
paymentRequestSchema.index({ friendId: 1, status: 1 });
paymentRequestSchema.index({ expiresAt: 1 });

// Check if request is expired
paymentRequestSchema.methods.isExpired = function () {
    return this.status === 'pending' && new Date() > this.expiresAt;
};

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
