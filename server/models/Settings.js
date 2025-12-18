const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    trackingEnabled: {
        type: Boolean,
        default: false
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

// Singleton pattern - only one settings document
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({ trackingEnabled: false, maintenanceMode: false });
    }
    return settings;
};

settingsSchema.statics.updateTracking = async function (enabled, adminId) {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({ trackingEnabled: enabled, updatedBy: adminId });
    } else {
        settings.trackingEnabled = enabled;
        settings.updatedBy = adminId;
        settings.updatedAt = new Date();
        await settings.save();
    }
    return settings;
};

// Get maintenance mode status
settingsSchema.statics.getMaintenanceStatus = async function () {
    const settings = await this.getSettings();
    return settings.maintenanceMode;
};

// Update maintenance mode
settingsSchema.statics.updateMaintenanceMode = async function (enabled, adminId) {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({ maintenanceMode: enabled, updatedBy: adminId });
    } else {
        settings.maintenanceMode = enabled;
        settings.updatedBy = adminId;
        settings.updatedAt = new Date();
        await settings.save();
    }
    return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
