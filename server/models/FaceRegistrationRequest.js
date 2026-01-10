const mongoose = require('mongoose');

const faceRegistrationRequestSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    adminName: {
        type: String,
        required: true
    },
    adminEmail: {
        type: String,
        required: true
    },
    adminRole: {
        type: String,
        required: true
    },
    faceDescriptor: {
        type: [Number], // 128-dimension face descriptor array
        required: true
    },
    faceImage: {
        type: String, // Base64 encoded image for preview
        required: false
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        default: null
    }
});

// Index for faster queries
faceRegistrationRequestSchema.index({ adminId: 1, status: 1 });
faceRegistrationRequestSchema.index({ status: 1, requestedAt: -1 });

module.exports = mongoose.model('FaceRegistrationRequest', faceRegistrationRequestSchema);
