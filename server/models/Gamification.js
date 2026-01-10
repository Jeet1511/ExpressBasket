const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    points: { type: Number, required: true },
    category: { type: String, enum: ['shopping', 'engagement', 'special'], required: true },
    unlockedAt: { type: Date, default: Date.now }
});

const pointHistorySchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    type: { type: String, enum: ['earn', 'redeem'], required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    createdAt: { type: Date, default: Date.now }
});

const rewardSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    pointsCost: { type: Number, required: true },
    value: { type: Number, required: true }, // Discount value in rupees
    type: { type: String, enum: ['discount', 'free_delivery', 'premium'], required: true },
    redeemedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
});

const gamificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    points: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    levelName: {
        type: String,
        default: 'Bronze'
    },
    achievements: [achievementSchema],
    pointHistory: [pointHistorySchema],
    redeemedRewards: [rewardSchema],
    checkInStreak: {
        type: Number,
        default: 0
    },
    lastCheckIn: {
        type: Date
    },
    totalOrders: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    reviewsWritten: {
        type: Number,
        default: 0
    },
    referrals: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Calculate level based on points
gamificationSchema.methods.calculateLevel = function () {
    const points = this.points;

    if (points >= 1501) {
        this.level = 6;
        this.levelName = 'Elite';
    } else if (points >= 1001) {
        this.level = 5;
        this.levelName = 'Diamond';
    } else if (points >= 601) {
        this.level = 4;
        this.levelName = 'Platinum';
    } else if (points >= 301) {
        this.level = 3;
        this.levelName = 'Gold';
    } else if (points >= 101) {
        this.level = 2;
        this.levelName = 'Silver';
    } else {
        this.level = 1;
        this.levelName = 'Bronze';
    }

    return { level: this.level, levelName: this.levelName };
};

// Add points
gamificationSchema.methods.addPoints = function (amount, reason, orderId = null) {
    this.points += amount;
    this.pointHistory.push({
        amount,
        reason,
        type: 'earn',
        orderId
    });
    this.calculateLevel();
    // Don't auto-save to prevent race conditions - caller should save
};

// Redeem points
gamificationSchema.methods.redeemPoints = function (amount, rewardData) {
    if (this.points < amount) {
        throw new Error('Insufficient points');
    }

    this.points -= amount;
    this.pointHistory.push({
        amount: -amount,
        reason: `Redeemed: ${rewardData.name}`,
        type: 'redeem'
    });

    this.redeemedRewards.push(rewardData);
    this.calculateLevel();

    // Mark arrays as modified so Mongoose saves them
    this.markModified('pointHistory');
    this.markModified('redeemedRewards');
    // Don't auto-save to prevent race conditions - caller should save
};

// Mark reward as used
gamificationSchema.methods.markRewardAsUsed = function (rewardCode, orderId) {
    const reward = this.redeemedRewards.find(r => r.code === rewardCode);

    if (!reward) {
        throw new Error('Reward code not found');
    }

    if (reward.usedAt) {
        throw new Error('Reward has already been used');
    }

    if (reward.expiresAt && new Date(reward.expiresAt) < new Date()) {
        throw new Error('Reward has expired');
    }

    reward.usedAt = new Date();
    reward.orderId = orderId;

    // CRITICAL: Mark the array as modified so Mongoose saves it
    this.markModified('redeemedRewards');
    // Don't auto-save to prevent race conditions - caller should save
};

// Check and unlock achievement
gamificationSchema.methods.checkAchievement = function (achievementId, achievementData) {
    const alreadyUnlocked = this.achievements.some(a => a.id === achievementId);

    if (!alreadyUnlocked) {
        this.achievements.push({
            id: achievementId,
            name: achievementData.name,
            description: achievementData.description,
            icon: achievementData.icon,
            points: achievementData.points,
            category: achievementData.category
        });

        this.addPoints(achievementData.points, `Achievement: ${achievementData.name}`);
        return true;
    }

    return false;
};

// Daily check-in
gamificationSchema.methods.dailyCheckIn = function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastCheckIn = this.lastCheckIn ? new Date(this.lastCheckIn) : null;
    if (lastCheckIn) {
        lastCheckIn.setHours(0, 0, 0, 0);
    }

    // Check if already checked in today
    if (lastCheckIn && lastCheckIn.getTime() === today.getTime()) {
        return { success: false, message: 'Already checked in today' };
    }

    // Check if streak continues (checked in yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastCheckIn && lastCheckIn.getTime() === yesterday.getTime()) {
        this.checkInStreak += 1;
    } else {
        this.checkInStreak = 1;
    }

    this.lastCheckIn = new Date();

    // Calculate points (5 base + streak bonus, max 7 days)
    const basePoints = 5;
    const streakBonus = Math.min(this.checkInStreak - 1, 6) * 5;
    let totalPoints = basePoints + streakBonus;

    // Apply 30% bonus for each completed 30-day cycle
    const completedCycles = Math.floor(this.checkInStreak / 30);
    if (completedCycles > 0) {
        const bonusMultiplier = 1 + (completedCycles * 0.30); // 30% per cycle
        totalPoints = Math.floor(totalPoints * bonusMultiplier);
    }

    this.addPoints(totalPoints, `Daily check-in (${this.checkInStreak} day streak${completedCycles > 0 ? ` +${completedCycles * 30}% bonus` : ''})`);

    return {
        success: true,
        points: totalPoints,
        streak: this.checkInStreak,
        bonusApplied: completedCycles > 0,
        bonusPercentage: completedCycles * 30
    };
};

module.exports = mongoose.model('Gamification', gamificationSchema);
