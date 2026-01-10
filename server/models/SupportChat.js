const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'messages.senderModel',
        required: true
    },
    senderModel: {
        type: String,
        enum: ['User', 'Admin'],
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const supportChatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'closed'],
        default: 'pending'
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    messages: [messageSchema],
    closedAt: {
        type: Date,
        default: null
    },
    closedBy: {
        type: String,
        enum: ['user', 'admin', null],
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
supportChatSchema.index({ user: 1, status: 1 });
supportChatSchema.index({ admin: 1, status: 1 });
supportChatSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportChat', supportChatSchema);
