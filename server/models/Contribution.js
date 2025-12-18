const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'product_added',
            'product_updated',
            'product_deleted',
            'category_added',
            'category_updated',
            'category_deleted',
            'order_updated',
            'order_deleted',
            'user_updated',
            'user_deleted',
            'admin_created',
            'admin_updated',
            'admin_deleted',
            'membership_updated',
            'wallet_deposit',
            'wallet_withdraw',
            'mail_sent',
            'login'
        ]
    },
    description: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Index for faster queries
contributionSchema.index({ admin: 1, createdAt: -1 });
contributionSchema.index({ createdAt: -1 });

// Static method to log contribution
contributionSchema.statics.log = async function (adminId, action, description, metadata = {}) {
    try {
        const contribution = new this({
            admin: adminId,
            action,
            description,
            metadata
        });
        await contribution.save();
        return contribution;
    } catch (error) {
        console.error('Failed to log contribution:', error);
        return null;
    }
};

module.exports = mongoose.model('Contribution', contributionSchema);
