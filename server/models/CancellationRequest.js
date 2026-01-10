const mongoose = require('mongoose');

const CancellationRequestSchema = new mongoose.Schema({
    delivery: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Delivery',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPartner',
        required: true
    },
    partnerName: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true,
        minlength: 10
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminReview: {
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        reviewedAt: Date,
        adminNotes: String,
        payoutAmount: {
            type: Number,
            default: 0
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('CancellationRequest', CancellationRequestSchema);
