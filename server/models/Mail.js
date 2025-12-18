const mongoose = require('mongoose');

const mailSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'fromModel',
        required: true
    },
    fromModel: {
        type: String,
        enum: ['Admin', 'User'],
        default: 'Admin'
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    // Mail type - normal or payment_request
    type: {
        type: String,
        enum: ['normal', 'payment_request'],
        default: 'normal'
    },
    // For payment request mails
    paymentRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentRequest'
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
mailSchema.index({ to: 1, createdAt: -1 });
mailSchema.index({ from: 1, createdAt: -1 });
mailSchema.index({ paymentRequestId: 1 });

module.exports = mongoose.model('Mail', mailSchema);

