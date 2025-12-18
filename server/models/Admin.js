const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
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
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'vendor', 'normal_viewer', 'special_viewer'],
        default: 'vendor'
    },
    permissions: [{
        type: String,
        enum: [
            'manage_products', 'manage_categories', 'manage_orders', 'manage_users',
            'manage_admins', 'manage_admins_passwords', 'manage_admins_roles',
            'view_reports', 'manage_memberships', 'manage_wallets',
            // New view-only permissions
            'view_everything', 'view_products', 'view_categories', 'view_orders'
        ]
    }],
    tags: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);