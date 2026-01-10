const mongoose = require('mongoose');

const giftCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    discountAmount: {
        type: Number,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false,
        index: true
    },
    usedAt: {
        type: Date
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
giftCodeSchema.index({ userId: 1, isUsed: 1, expiresAt: 1 });

// Static method to generate unique code
giftCodeSchema.statics.generateUniqueCode = async function () {
    const crypto = require('crypto');
    let code;
    let exists = true;

    while (exists) {
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
        code = `GIFT-${randomPart}`;
        exists = await this.findOne({ code });
    }

    return code;
};

// Static method to create a gift code
giftCodeSchema.statics.createGiftCode = async function (userId, discountAmount, daysValid = 30) {
    const code = await this.generateUniqueCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    return await this.create({
        code,
        userId,
        discountAmount,
        expiresAt
    });
};

// Method to use a gift code (atomic operation)
giftCodeSchema.statics.useCode = async function (code, orderId) {
    const result = await this.findOneAndUpdate(
        {
            code,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        },
        {
            $set: {
                isUsed: true,
                usedAt: new Date(),
                orderId
            }
        },
        { new: true }
    );

    if (!result) {
        throw new Error('Invalid, expired, or already used code');
    }

    return result;
};

module.exports = mongoose.model('GiftCode', giftCodeSchema);
