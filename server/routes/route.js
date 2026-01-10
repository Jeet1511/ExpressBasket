const express = require('express');
const router = express.Router();
const User = require('../models/User.js');
const Order = require('../models/Order.js');
const Product = require('../models/Product.js');
const Settings = require('../models/Settings.js');
const Mail = require('../models/Mail.js');
const PaymentRequest = require('../models/PaymentRequest.js');
const GiftCode = require('../models/GiftCode.js');
const Gamification = require('../models/Gamification.js');
const SupportChat = require('../models/SupportChat.js');
const Admin = require('../models/Admin.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../config/emailConfig.js');

// User Registration
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            phone
        });

        await newUser.save();

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// User Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin Authentication Middleware
const authenticateAdminToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, admin) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.admin = admin;
        next();
    });
};

// Block viewers from write operations (POST, PUT, DELETE)
// Viewers can only view (GET requests)
const blockViewersWrite = (req, res, next) => {
    const viewerRoles = ['normal_viewer', 'special_viewer'];

    if (viewerRoles.includes(req.admin?.role)) {
        // Only allow GET requests for viewers
        if (req.method !== 'GET') {
            return res.status(403).json({
                message: 'Viewers do not have permission to modify data. You can only view content.',
                role: req.admin.role
            });
        }
    }
    next();
};

// Combined middleware: authenticate admin + block viewers from write operations
const authenticateAdminWithWriteProtection = [authenticateAdminToken, blockViewersWrite];

// Get user profile
router.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user by ID (for fetching delivery location)
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update user profile
router.put('/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, address, deliveryLocation } = req.body;

        const updateData = { name, phone };

        // Handle delivery location if provided
        if (deliveryLocation) {
            updateData.deliveryLocation = {
                address: deliveryLocation.address,
                coordinates: deliveryLocation.coordinates,
                nearestHub: deliveryLocation.nearestHub,
                lastUpdated: new Date()
            };

            // Auto-populate address from delivery location if addressComponents provided
            if (deliveryLocation.addressComponents) {
                const addr = deliveryLocation.addressComponents;
                updateData.address = {
                    street: addr.street || addr.road || addr.suburb || '',
                    city: addr.city || addr.town || addr.village || '',
                    state: addr.state || '',
                    pincode: addr.postcode || addr.pincode || ''
                };
            }
        } else if (address) {
            // Manual address update if no delivery location
            updateData.address = address;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            updateData,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create order (User only)
router.post('/order', authenticateToken, async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod, giftCode } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        // Calculate total amount and validate items
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ message: `Product ${item.productId} not found` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }

            orderItems.push({
                productId: item.productId,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.image
            });

            totalAmount += product.price * item.quantity;

            // Update product stock
            product.stock -= item.quantity;
            await product.save();
        }

        // Validate and apply gift code if provided
        let discount = 0;
        let appliedGiftCode = null;

        if (giftCode) {
            try {
                const code = await GiftCode.findOne({
                    code: giftCode,
                    userId: req.user.userId,
                    isUsed: false,
                    expiresAt: { $gt: new Date() }
                });

                if (!code) {
                    return res.status(400).json({ message: 'Invalid, expired, or already used gift code' });
                }

                discount = code.discountAmount;
                appliedGiftCode = {
                    code: code.code,
                    discountAmount: code.discountAmount
                };
            } catch (error) {
                console.error('Gift code validation error:', error);
                return res.status(400).json({ message: 'Error validating gift code' });
            }
        }

        // Apply discount
        const finalAmount = Math.max(0, totalAmount - discount);

        // Get user's delivery location for routing
        const user = await User.findById(req.user.userId).select('deliveryLocation');
        const deliveryLocation = user?.deliveryLocation || null;

        // Create order
        const order = new Order({
            userId: req.user.userId,
            items: orderItems,
            totalAmount: finalAmount,
            shippingAddress,
            paymentMethod: paymentMethod || 'cod',
            deliveryLocation: deliveryLocation ? {
                coordinates: deliveryLocation.coordinates,
                address: deliveryLocation.address
            } : null
        });

        await order.save();

        // Mark gift code as used AFTER successful order creation (atomic operation)
        if (giftCode) {
            try {
                await GiftCode.useCode(giftCode, order._id);
            } catch (error) {
                console.error('Error marking gift code as used:', error);
                // Order is already created, so just log the error
            }
        }

        // ===== BROADCAST NEW ORDER TO ADMINS FOR REAL-TIME UPDATES =====
        try {
            const { broadcastNewOrder } = require('../socketHandler.js');
            // Populate order with user details for admin display
            const populatedOrder = await Order.findById(order._id)
                .populate('userId', 'name email phone');
            broadcastNewOrder(populatedOrder);
        } catch (socketError) {
            console.error('Socket broadcast error:', socketError);
            // Don't fail the order if broadcast fails
        }


        // ===== GAMIFICATION: Award points for order =====
        try {
            let gamification = await Gamification.findOne({ userId: req.user.userId });
            if (!gamification) {
                gamification = new Gamification({ userId: req.user.userId });
            }

            // Calculate points: 10 points per ₹100 spent
            const pointsEarned = Math.floor(totalAmount / 100) * 10;
            await gamification.addPoints(pointsEarned, `Order placed (₹${totalAmount})`, order._id);

            // Update stats
            gamification.totalOrders += 1;
            gamification.totalSpent += totalAmount;

            // Check for achievements
            const hour = new Date().getHours();

            // First purchase achievement
            if (gamification.totalOrders === 1) {
                gamification.checkAchievement('first_purchase', ACHIEVEMENTS.first_purchase);
            }

            // Early bird achievement (before 7 AM)
            if (hour < 7) {
                gamification.checkAchievement('early_bird', ACHIEVEMENTS.early_bird);
            }

            // Night owl achievement (after 10 PM)
            if (hour >= 22) {
                gamification.checkAchievement('night_owl', ACHIEVEMENTS.night_owl);
            }

            // Century club achievement (₹10,000 total spent)
            if (gamification.totalSpent >= 10000) {
                gamification.checkAchievement('century_club', ACHIEVEMENTS.century_club);
            }

            // VIP shopper achievement (50 orders)
            if (gamification.totalOrders >= 50) {
                gamification.checkAchievement('vip_shopper', ACHIEVEMENTS.vip_shopper);
            }

            await gamification.save();
        } catch (gamificationError) {
            console.error('Gamification error:', gamificationError);
            // Don't fail the order if gamification fails
        }

        res.status(201).json({
            message: 'Order placed successfully',
            order: {
                id: order._id,
                totalAmount: order.totalAmount,
                status: order.status,
                orderDate: order.orderDate
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user orders (User only) - includes delivery OTP for active orders
router.get('/user/orders', authenticateToken, async (req, res) => {
    try {
        const Delivery = require('../models/Delivery.js');

        const orders = await Order.find({ userId: req.user.userId })
            .sort({ orderDate: -1 });

        // For each active order, get the delivery OTP
        const ordersWithOTP = await Promise.all(orders.map(async (order) => {
            const orderObj = order.toObject();

            // Only get OTP for active delivery statuses
            if (['assigned', 'out_for_delivery'].includes(order.status)) {
                const delivery = await Delivery.findOne({
                    order: order._id,
                    status: { $in: ['pending_acceptance', 'accepted', 'picked_up', 'in_transit'] }
                });
                if (delivery) {
                    orderObj.deliveryOTP = delivery.otp;
                }
            }

            return orderObj;
        }));

        res.json(ordersWithOTP);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single order by ID (User only)
router.get('/user/orders/:id', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify the order belongs to the requesting user
        if (order.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get delivery progress for user's order
router.get('/user/orders/:id/progress', authenticateToken, async (req, res) => {
    try {
        const { getProgressInfo } = require('../utils/progressUtils.js');

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify the order belongs to the requesting user
        if (order.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if order has delivery progress tracking
        if (!order.deliveryProgress || !order.deliveryProgress.startTime) {
            return res.json({
                hasProgress: false,
                message: 'Delivery progress tracking not started for this order'
            });
        }

        // Calculate current progress
        const progressInfo = getProgressInfo(
            order.deliveryProgress.startTime,
            order.deliveryProgress.estimatedDeliveryMinutes
        );

        // When progress reaches 100%, show WAITING FOR CONFIRMATION (don't auto-complete)
        // Delivery partner must enter OTP from customer to complete
        if (progressInfo.progress >= 100 && order.status === 'out_for_delivery') {
            console.log(`📍 Delivery partner has REACHED customer for order ${order._id.toString().slice(-6)}`);

            // Update progress to 100% but DON'T change status - wait for OTP
            order.deliveryProgress.currentProgress = 100;
            order.deliveryProgress.lastUpdated = new Date();
            await order.save();

            return res.json({
                hasProgress: true,
                orderId: order._id,
                status: 'out_for_delivery', // Still out_for_delivery until OTP confirmed
                reached: true, // New flag to indicate partner has arrived
                progress: 100,
                remainingMinutes: 0,
                remainingTime: 'WAITING FOR CONFIRMATION',
                message: 'Partner has arrived! Waiting for OTP confirmation',
                color: '#f59e0b', // Orange - waiting
                isDelayed: false,
                startTime: order.deliveryProgress.startTime,
                estimatedMinutes: order.deliveryProgress.estimatedDeliveryMinutes
            });
        }

        // Update the order's current progress in database
        await Order.findByIdAndUpdate(req.params.id, {
            'deliveryProgress.currentProgress': progressInfo.progress,
            'deliveryProgress.lastUpdated': new Date()
        });

        res.json({
            hasProgress: true,
            orderId: order._id,
            status: order.status,
            ...progressInfo,
            startTime: order.deliveryProgress.startTime,
            estimatedMinutes: order.deliveryProgress.estimatedDeliveryMinutes,
            completedAt: order.deliveryProgress.completedAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// TEMPORARY: Manually initialize timer data for an order (for testing)
router.post('/user/orders/:id/init-timer', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('userId', 'loyaltyBadge');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Verify the order belongs to the requesting user
        if (order.userId._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get membership tier
        const membershipTier = order.userId?.loyaltyBadge?.type || 'none';

        // Generate estimated delivery time based on membership tier
        let minTime, maxTime;
        switch (membershipTier.toLowerCase()) {
            case 'platinum':
                minTime = 10;
                maxTime = 15;
                break;
            case 'gold':
                minTime = 15;
                maxTime = 20;
                break;
            case 'silver':
                minTime = 20;
                maxTime = 25;
                break;
            default:
                minTime = 25;
                maxTime = 30;
                break;
        }

        const estimatedMinutes = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
        const startTime = new Date();

        // Initialize timer data
        order.deliveryStartTime = startTime;
        order.estimatedDeliveryMinutes = estimatedMinutes;
        order.deliveryProgress = {
            startTime: startTime,
            estimatedDeliveryMinutes: estimatedMinutes,
            currentProgress: 0,
            lastUpdated: startTime
        };

        await order.save();

        console.log(`✅ Timer initialized for order ${order._id.toString().slice(-6)}: ${estimatedMinutes} minutes`);

        res.json({
            success: true,
            message: 'Timer data initialized successfully',
            order: {
                id: order._id,
                deliveryStartTime: order.deliveryStartTime,
                estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
                membershipTier: membershipTier
            }
        });
    } catch (error) {
        console.error('Error initializing timer:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get order details publicly (for QR code bill viewing)
router.get('/order/public/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate('userId', 'name email phone address')
            .populate('items.productId', 'name price image');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// Get user stats (total orders, total spend, etc.)
router.get('/user/stats', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId });
        const user = await User.findById(req.user.userId).select('-password');

        const totalOrders = orders.length;
        const totalSpend = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const deliveredOrders = orders.filter(order => order.status === 'delivered').length;

        res.json({
            totalOrders,
            totalSpend,
            deliveredOrders,
            memberSince: user.createdAt,
            loyaltyBadge: user.loyaltyBadge || { type: 'none' }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Badge pricing
const BADGE_PRICES = {
    silver: 99,
    gold: 199,
    platinum: 499
};

// Buy loyalty badge
router.post('/user/buy-badge', authenticateToken, async (req, res) => {
    try {
        const { badgeType } = req.body;

        if (!['silver', 'gold', 'platinum'].includes(badgeType)) {
            return res.status(400).json({ message: 'Invalid badge type' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user already has this or higher badge
        const badgeLevels = { none: 0, silver: 1, gold: 2, platinum: 3 };
        const currentLevel = badgeLevels[user.loyaltyBadge?.type || 'none'];
        const newLevel = badgeLevels[badgeType];

        if (currentLevel >= newLevel) {
            return res.status(400).json({ message: 'You already have this badge or better' });
        }

        // Get badge price
        const badgePrice = BADGE_PRICES[badgeType];

        // Check wallet balance
        const currentBalance = user.walletBalance || 0;
        if (currentBalance < badgePrice) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                balance: currentBalance,
                required: badgePrice,
                shortfall: badgePrice - currentBalance
            });
        }

        // Deduct from wallet
        user.walletBalance -= badgePrice;

        // Add transaction to wallet history
        user.walletHistory = user.walletHistory || [];
        user.walletHistory.push({
            type: 'membership_purchase',
            amount: -badgePrice,
            description: `Purchased ${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} membership badge`,
            createdAt: new Date()
        });

        // Set expiry date (1 year from now)
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        // Update user badge
        user.loyaltyBadge = {
            type: badgeType,
            purchasedAt: new Date(),
            expiresAt: expiresAt,
            assignedBy: null // Self-purchased
        };

        await user.save();

        res.json({
            message: `${badgeType.charAt(0).toUpperCase() + badgeType.slice(1)} badge purchased successfully!`,
            badge: user.loyaltyBadge,
            price: badgePrice,
            newBalance: user.walletBalance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get badge prices
router.get('/badges/prices', (req, res) => {
    res.json({
        badges: [
            { type: 'silver', price: 99, benefits: ['Free delivery on orders above ₹300', '5% discount on all products'] },
            { type: 'gold', price: 199, benefits: ['Free delivery on all orders', '10% discount on all products', 'Priority support'] },
            { type: 'platinum', price: 499, benefits: ['Free delivery on all orders', '15% discount on all products', 'Priority support', 'Early access to deals'] }
        ]
    });
});

// ============ WALLET SYSTEM ============

// Get wallet balance and history
router.get('/user/wallet', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('walletBalance walletHistory');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            balance: user.walletBalance || 0,
            history: (user.walletHistory || []).slice(-20).reverse() // Last 20 transactions
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Top-up wallet (simulated - in production would integrate with payment gateway)
router.post('/user/wallet/topup', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.walletBalance = (user.walletBalance || 0) + amount;
        user.walletHistory = user.walletHistory || [];
        user.walletHistory.push({
            type: 'topup',
            amount: amount,
            description: `Wallet top-up of ₹${amount}`,
            createdAt: new Date()
        });

        await user.save();

        res.json({
            message: `₹${amount} added to wallet successfully!`,
            newBalance: user.walletBalance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Find friend by phone number
router.get('/user/find-friend/:phone', authenticateToken, async (req, res) => {
    try {
        const friend = await User.findOne({ phone: req.params.phone }).select('name phone');

        if (!friend) {
            return res.status(404).json({ message: 'No user found with this phone number' });
        }

        if (friend._id.toString() === req.user.userId) {
            return res.status(400).json({ message: 'You cannot pay yourself' });
        }

        res.json({
            id: friend._id,
            name: friend.name,
            phone: friend.phone
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Pay with wallet
router.post('/user/wallet/pay', authenticateToken, async (req, res) => {
    try {
        const { amount, orderId, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if ((user.walletBalance || 0) < amount) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                balance: user.walletBalance || 0,
                required: amount
            });
        }

        user.walletBalance -= amount;
        user.walletHistory = user.walletHistory || [];
        user.walletHistory.push({
            type: 'purchase',
            amount: -amount,
            description: description || `Purchase payment of ₹${amount}`,
            orderId: orderId,
            createdAt: new Date()
        });

        await user.save();

        res.json({
            success: true,
            message: 'Payment successful!',
            newBalance: user.walletBalance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Pay via friend's wallet - Now sends payment request instead of direct deduction
router.post('/user/wallet/pay-friend', authenticateToken, async (req, res) => {
    try {
        const { friendId, amount, cartItems, shippingAddress, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (!friendId) {
            return res.status(400).json({ message: 'Friend ID is required' });
        }

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: 'Cart items are required' });
        }

        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json({ message: 'Friend not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if friend has sufficient balance
        if ((friend.walletBalance || 0) < amount) {
            return res.status(400).json({
                message: `${friend.name}'s wallet has insufficient balance`,
                balance: friend.walletBalance || 0,
                required: amount
            });
        }

        // Create payment request
        const paymentRequest = new PaymentRequest({
            requesterId: req.user.userId,
            friendId: friendId,
            amount: amount,
            cartItems: cartItems,
            shippingAddress: shippingAddress,
            status: 'pending'
        });

        await paymentRequest.save();

        // Create mail notification for friend
        const mail = new Mail({
            from: req.user.userId,
            fromModel: 'User',
            to: friendId,
            subject: `💳 Payment Request from ${user.name}`,
            message: `${user.name} is requesting you to pay ₹${amount.toFixed(2)} for their order.\n\nItems: ${cartItems.length} items\n\nPlease approve or reject this request from your mailbox. The request will expire in 30 minutes.`,
            type: 'payment_request',
            paymentRequestId: paymentRequest._id
        });

        await mail.save();

        // Emit real-time notification to friend
        const { sendMailNotification } = require('../socketHandler.js');
        sendMailNotification(friendId, {
            _id: mail._id,
            subject: mail.subject,
            message: mail.message,
            type: 'payment_request',
            paymentRequestId: paymentRequest._id,
            createdAt: mail.createdAt
        });

        // Update payment request with mail ID
        paymentRequest.mailId = mail._id;
        await paymentRequest.save();

        res.json({
            success: true,
            message: `Payment request sent to ${friend.name}! Waiting for approval.`,
            paymentRequestId: paymentRequest._id,
            friendName: friend.name,
            expiresAt: paymentRequest.expiresAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get pending payment requests for the logged-in user (where they are the friend)
router.get('/user/payment-requests/pending', authenticateToken, async (req, res) => {
    try {
        const requests = await PaymentRequest.find({
            friendId: req.user.userId,
            status: 'pending'
        })
            .populate('requesterId', 'name email phone')
            .sort({ createdAt: -1 });

        // Check and update expired requests
        const now = new Date();
        const validRequests = [];

        for (const request of requests) {
            if (now > request.expiresAt) {
                request.status = 'expired';
                await request.save();
            } else {
                validRequests.push(request);
            }
        }

        res.json(validRequests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get my sent payment requests (where I am the requester)
router.get('/user/payment-requests/sent', authenticateToken, async (req, res) => {
    try {
        const requests = await PaymentRequest.find({
            requesterId: req.user.userId
        })
            .populate('friendId', 'name email phone')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get specific payment request status
router.get('/user/payment-requests/:id', authenticateToken, async (req, res) => {
    try {
        const request = await PaymentRequest.findById(req.params.id)
            .populate('requesterId', 'name email phone')
            .populate('friendId', 'name email phone');

        if (!request) {
            return res.status(404).json({ message: 'Payment request not found' });
        }

        // Check if user is involved in this request
        if (request.requesterId._id.toString() !== req.user.userId &&
            request.friendId._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to view this request' });
        }

        // Check if expired
        if (request.status === 'pending' && new Date() > request.expiresAt) {
            request.status = 'expired';
            await request.save();
        }

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Respond to payment request (approve or reject)
router.post('/user/payment-requests/:id/respond', authenticateToken, async (req, res) => {
    try {
        const { action, message } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Action must be approve or reject' });
        }

        const paymentRequest = await PaymentRequest.findById(req.params.id)
            .populate('requesterId', 'name email phone address');

        if (!paymentRequest) {
            return res.status(404).json({ message: 'Payment request not found' });
        }

        // Only the friend can respond
        if (paymentRequest.friendId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only the recipient can respond to this request' });
        }

        // Check if already responded or expired
        if (paymentRequest.status !== 'pending') {
            return res.status(400).json({ message: `This request is already ${paymentRequest.status}` });
        }

        // Check if expired
        if (new Date() > paymentRequest.expiresAt) {
            paymentRequest.status = 'expired';
            await paymentRequest.save();
            return res.status(400).json({ message: 'This request has expired' });
        }

        const friend = await User.findById(req.user.userId);
        const requester = await User.findById(paymentRequest.requesterId);

        if (action === 'reject') {
            paymentRequest.status = 'rejected';
            paymentRequest.responseMessage = message || 'Request rejected';
            paymentRequest.respondedAt = new Date();
            await paymentRequest.save();

            // Send rejection notification mail to requester
            const rejectionMail = new Mail({
                from: req.user.userId,
                fromModel: 'User',
                to: paymentRequest.requesterId,
                subject: `❌ Payment Request Rejected`,
                message: `${friend.name} has rejected your payment request of ₹${paymentRequest.amount.toFixed(2)}.\n\n${message ? `Message: ${message}` : 'Please try another payment method.'}`,
                type: 'normal'
            });
            await rejectionMail.save();

            return res.json({
                success: true,
                message: 'Payment request rejected',
                status: 'rejected'
            });
        }

        // Approve action
        // Check wallet balance
        if ((friend.walletBalance || 0) < paymentRequest.amount) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                balance: friend.walletBalance || 0,
                required: paymentRequest.amount
            });
        }

        // Deduct from friend's wallet
        friend.walletBalance -= paymentRequest.amount;
        friend.walletHistory = friend.walletHistory || [];
        friend.walletHistory.push({
            type: 'friend_payment',
            amount: -paymentRequest.amount,
            description: `Payment for ${requester.name}'s order`,
            friendId: requester._id,
            createdAt: new Date()
        });
        await friend.save();

        // Create the order
        const order = new Order({
            userId: paymentRequest.requesterId,
            items: paymentRequest.cartItems,
            totalAmount: paymentRequest.amount,
            shippingAddress: paymentRequest.shippingAddress,
            paymentMethod: 'friend_wallet',
            status: 'confirmed',
            statusHistory: [{
                status: 'confirmed',
                timestamp: new Date(),
                message: `Paid by ${friend.name} via wallet`
            }]
        });
        await order.save();

        // Update payment request
        paymentRequest.status = 'completed';
        paymentRequest.orderId = order._id;
        paymentRequest.responseMessage = message || 'Approved';
        paymentRequest.respondedAt = new Date();
        await paymentRequest.save();

        // Send approval notification mail to requester
        const approvalMail = new Mail({
            from: req.user.userId,
            fromModel: 'User',
            to: paymentRequest.requesterId,
            subject: `✅ Payment Approved - Order Placed!`,
            message: `${friend.name} has approved your payment request and paid ₹${paymentRequest.amount.toFixed(2)} from their wallet.\n\nYour order has been placed successfully!\nOrder ID: ${order._id.toString().slice(-6).toUpperCase()}`,
            type: 'normal'
        });
        await approvalMail.save();

        res.json({
            success: true,
            message: `Payment approved! Order placed for ${requester.name}`,
            status: 'completed',
            orderId: order._id,
            newBalance: friend.walletBalance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// ============ FORGOT PASSWORD SYSTEM ============

// Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        console.log('🔐 Password reset request received for:', email);

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ No user found with email:', email);
            return res.status(404).json({ message: 'No account found with this email' });
        }

        console.log('✅ User found:', user.name);

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Set token and expiration (1 hour)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();
        console.log('✅ Reset token saved to database');

        // Send email
        console.log('📧 Attempting to send password reset email...');
        const emailResult = await sendPasswordResetEmail(email, resetToken, user.name);

        if (!emailResult.success) {
            console.error('❌ Email sending failed:', emailResult.error);
            return res.status(500).json({
                message: emailResult.error || 'Failed to send email. Please try again.',
                details: emailResult.details
            });
        }

        console.log('✅ Password reset email sent successfully!');
        res.json({
            message: 'Password reset email sent successfully! Check your inbox.',
            email: email
        });
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Verify reset token
router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('-password');

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired reset token',
                expired: true
            });
        }

        res.json({
            valid: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Reset password (view old or set new)
router.post('/reset-password', async (req, res) => {
    try {
        const { token, action, newPassword } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Reset token is required' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired reset token',
                expired: true
            });
        }

        // Action: view old password
        if (action === 'view') {
            // Note: This is not secure practice, but implemented as requested
            return res.json({
                message: 'Old password retrieved',
                oldPassword: user.password // This is hashed, cannot be decoded
            });
        }

        // Action: set new password
        if (action === 'reset') {
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;

            // Clear reset token
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            await user.save();

            return res.json({
                message: 'Password reset successfully! You can now login with your new password.'
            });
        }

        res.status(400).json({ message: 'Invalid action. Use "view" or "reset"' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ ORDER TRACKING SYSTEM ============

const DeliveryPartner = require('../models/DeliveryPartner.js');

// User: Get order tracking details
router.get('/user/orders/:orderId/track', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ _id: orderId, userId: req.user.userId })
            .populate('deliveryPartner.partnerId', 'name phone vehicle rating');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Calculate ETA and distance if delivery partner location exists
        let eta = null;
        let distance = null;

        if (order.deliveryPartner?.currentLocation && order.shippingAddress?.coordinates) {
            // Simple distance calculation (in real app, use Google Maps Distance Matrix API)
            const R = 6371; // Earth's radius in km
            const dLat = (order.shippingAddress.coordinates.lat - order.deliveryPartner.currentLocation.lat) * Math.PI / 180;
            const dLon = (order.shippingAddress.coordinates.lng - order.deliveryPartner.currentLocation.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(order.deliveryPartner.currentLocation.lat * Math.PI / 180) *
                Math.cos(order.shippingAddress.coordinates.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distance = (R * c).toFixed(2) + ' km';

            // Rough ETA calculation (assuming 30 km/h average speed)
            const timeInHours = (R * c) / 30;
            const timeInMinutes = Math.round(timeInHours * 60);
            eta = timeInMinutes > 60 ? `${Math.floor(timeInMinutes / 60)}h ${timeInMinutes % 60}m` : `${timeInMinutes} mins`;
        }

        res.json({
            orderId: order._id,
            status: order.status,
            statusHistory: order.statusHistory,
            deliveryPartner: order.deliveryPartner,
            currentLocation: order.deliveryPartner?.currentLocation,
            shippingAddress: order.shippingAddress,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            eta,
            distance,
            route: order.route,
            deliveryInstructions: order.deliveryInstructions,
            items: order.items,
            totalAmount: order.totalAmount
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// User: Rate delivery
router.post('/user/orders/:orderId/rate', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { overall, packaging, freshness, comment } = req.body;

        const order = await Order.findOne({ _id: orderId, userId: req.user.userId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'delivered') {
            return res.status(400).json({ message: 'Can only rate delivered orders' });
        }

        order.deliveryRating = {
            overall,
            packaging,
            freshness,
            comment,
            ratedAt: new Date()
        };

        await order.save();

        // Update delivery partner rating if assigned
        if (order.deliveryPartner?.partnerId) {
            const partner = await DeliveryPartner.findById(order.deliveryPartner.partnerId);
            if (partner) {
                const newRating = ((partner.rating * partner.totalDeliveries) + overall) / (partner.totalDeliveries + 1);
                partner.rating = newRating;
                await partner.save();
            }
        }

        res.json({ message: 'Rating submitted successfully', rating: order.deliveryRating });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Update order status
router.put('/admin/orders/:orderId/status', authenticateAdminWithWriteProtection, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, message } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Handle delivery progress tracking when status changes to out_for_delivery
        if (status === 'out_for_delivery') {
            // Populate user to get membership tier from loyaltyBadge
            await order.populate('userId', 'loyaltyBadge');

            console.log('🔍 Membership Detection Debug:', {
                userId: order.userId?._id,
                hasLoyaltyBadge: !!order.userId?.loyaltyBadge,
                loyaltyBadge: order.userId?.loyaltyBadge,
                badgeType: order.userId?.loyaltyBadge?.type
            });

            // Get membership tier from loyaltyBadge
            const membershipTier = order.userId?.loyaltyBadge?.type || 'none';

            // Generate random estimated delivery time based on membership tier
            let minTime, maxTime;
            switch (membershipTier.toLowerCase()) {
                case 'platinum':
                    minTime = 10;
                    maxTime = 15;
                    break;
                case 'gold':
                    minTime = 15;
                    maxTime = 20;
                    break;
                case 'silver':
                    minTime = 20;
                    maxTime = 25;
                    break;
                default: // 'none' or any other
                    minTime = 25;
                    maxTime = 30;
                    break;
            }

            // Generate random time between min and max (inclusive)
            const estimatedMinutes = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
            const startTime = new Date();

            console.log(`🚚 Initializing delivery progress:`, {
                orderId: order._id.toString().slice(-6),
                membershipTier: membershipTier.toUpperCase(),
                timeRange: `${minTime}-${maxTime} minutes`,
                assignedTime: `${estimatedMinutes} minutes`,
                startTime: startTime.toISOString()
            });

            // CRITICAL: Set deliveryProgress fields explicitly
            order.deliveryProgress = {
                startTime: startTime,
                estimatedDeliveryMinutes: estimatedMinutes,
                currentProgress: 0,
                lastUpdated: startTime
            };

            // ALSO set at order level for backward compatibility
            order.deliveryStartTime = startTime;
            order.estimatedDeliveryMinutes = estimatedMinutes;

            console.log(`📦 Update data being saved:`, JSON.stringify(order.deliveryProgress, null, 2));
        }

        order.status = status;
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            message: message || `Order ${status}`,
            updatedBy: req.admin.email
        });

        if (status === 'delivered') {
            order.deliveredDate = new Date();
            if (order.deliveryProgress) {
                order.deliveryProgress = {
                    ...order.deliveryProgress.toObject(),
                    currentProgress: 100,
                    completedAt: new Date(),
                    lastUpdated: new Date()
                };
            }
        }

        await order.save();

        // VERIFICATION: Log what was actually saved
        if (status === 'out_for_delivery') {
            console.log(`✅ Saved deliveryProgress:`, JSON.stringify(order.deliveryProgress, null, 2));
        }

        res.json({ message: 'Order status updated', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Assign delivery partner
router.post('/admin/orders/:orderId/assign-partner', authenticateAdminWithWriteProtection, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { partnerId } = req.body;

        const order = await Order.findById(orderId);
        const partner = await DeliveryPartner.findById(partnerId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (!partner) {
            return res.status(404).json({ message: 'Delivery partner not found' });
        }

        order.deliveryPartner = {
            partnerId: partner._id,
            name: partner.name,
            phone: partner.phone,
            vehicle: `${partner.vehicle.type} - ${partner.vehicle.number}`,
            currentLocation: partner.currentLocation
        };

        // Set estimated delivery time (1 hour from now as default)
        order.estimatedDeliveryTime = new Date(Date.now() + 60 * 60 * 1000);

        // Add to partner's active orders
        partner.activeOrders.push(order._id);
        partner.isAvailable = false;

        await order.save();
        await partner.save();

        res.json({ message: 'Delivery partner assigned', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Update delivery location
router.put('/admin/orders/:orderId/location', authenticateAdminToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { lat, lng } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (!order.deliveryPartner) {
            return res.status(400).json({ message: 'No delivery partner assigned' });
        }

        order.deliveryPartner.currentLocation = {
            lat,
            lng,
            timestamp: new Date()
        };

        await order.save();

        // Also update partner's location
        if (order.deliveryPartner.partnerId) {
            await DeliveryPartner.findByIdAndUpdate(order.deliveryPartner.partnerId, {
                currentLocation: {
                    lat,
                    lng,
                    timestamp: new Date()
                }
            });
        }

        res.json({ message: 'Location updated', location: order.deliveryPartner.currentLocation });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Get all delivery partners
router.get('/admin/delivery-partners', authenticateAdminToken, async (req, res) => {
    try {
        const partners = await DeliveryPartner.find().populate('activeOrders');
        res.json(partners);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Create delivery partner
router.post('/admin/delivery-partners', authenticateAdminWithWriteProtection, async (req, res) => {
    try {
        const { name, phone, email, vehicle } = req.body;

        const existingPartner = await DeliveryPartner.findOne({ email });
        if (existingPartner) {
            return res.status(400).json({ message: 'Delivery partner already exists' });
        }

        const partner = new DeliveryPartner({
            name,
            phone,
            email,
            vehicle
        });

        await partner.save();

        res.json({ message: 'Delivery partner created', partner });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ ENHANCED ROUTE TRACKING ============

const { geocodeAddress, calculateDeliveryTime, packagingPoints } = require('../utils/trackingUtils.js');

// Get available packaging points
router.get('/admin/packaging-points', authenticateAdminToken, async (req, res) => {
    try {
        res.json(packagingPoints);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Set route for order (packaging point + waypoints)
router.post('/admin/orders/:orderId/set-route', authenticateAdminWithWriteProtection, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { packagingPoint, waypoints = [], membershipType, expressDelivery } = req.body;

        console.log('=== SET ROUTE DEBUG START ===');
        console.log('Order ID:', orderId);

        // Populate userId with FULL loyaltyBadge - don't use select to avoid nested field issues
        const order = await Order.findById(orderId).populate('userId');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        console.log('Order found:', order._id);
        console.log('User ID:', order.userId?._id);
        console.log('User name:', order.userId?.name);
        console.log('Loyalty Badge FULL:', JSON.stringify(order.userId?.loyaltyBadge, null, 2));
        console.log('Loyalty Badge .type:', order.userId?.loyaltyBadge?.type);
        console.log('Type of loyaltyBadge.type:', typeof order.userId?.loyaltyBadge?.type);
        console.log('Membership from request:', membershipType);

        // Set packaging point
        order.packagingPoint = packagingPoint;

        // Process waypoints - geocode if needed
        order.routeWaypoints = [];
        for (let i = 0; i < waypoints.length; i++) {
            const waypoint = waypoints[i];
            let coordinates = waypoint.coordinates;

            // If coordinates not provided, try to geocode
            if (!coordinates && (waypoint.address || waypoint.pincode)) {
                try {
                    const searchAddress = waypoint.pincode ?
                        `${waypoint.name}, ${waypoint.pincode}` :
                        waypoint.address;
                    coordinates = await geocodeAddress(searchAddress);
                } catch (err) {
                    console.error(`Failed to geocode waypoint: ${waypoint.name}`);
                }
            }

            order.routeWaypoints.push({
                name: waypoint.name,
                address: waypoint.address,
                pincode: waypoint.pincode,
                coordinates,
                order: i + 1,
                reached: false
            });
        }

        // Calculate delivery time based on membership - DETAILED DEBUG
        const detectedType = order.userId?.loyaltyBadge?.type;
        const userMembershipType = membershipType || detectedType || 'none';

        console.log('Final membership type used:', userMembershipType);
        console.log('Calling calculateDeliveryTime with:', { userMembershipType, expressDelivery });

        const timing = calculateDeliveryTime(userMembershipType, expressDelivery || false);

        console.log('Calculated timing:', timing);
        console.log('=== SET ROUTE DEBUG END ===');

        order.deliveryTiming = {
            estimatedMinutes: timing.estimatedMinutes,
            membershipType: userMembershipType,
            expressDelivery: expressDelivery || false,
            expressDeliveryCharge: timing.expressCharge
        };

        // Set estimated delivery time
        order.estimatedDeliveryTime = new Date(Date.now() + timing.estimatedMinutes * 60 * 1000);

        // Update route origin and destination
        order.route = {
            origin: packagingPoint.coordinates,
            destination: order.shippingAddress?.coordinates || { lat: 0, lng: 0 }
        };

        await order.save();

        res.json({
            message: 'Route configured successfully',
            order,
            deliveryTime: `${timing.estimatedMinutes} minutes`,
            expressCharge: timing.expressCharge
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Update waypoint status (mark as reached)
router.put('/admin/orders/:orderId/waypoint/:waypointIndex', authenticateAdminToken, async (req, res) => {
    try {
        const { orderId, waypointIndex } = req.params;
        const { reached } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const index = parseInt(waypointIndex);
        if (index < 0 || index >= order.routeWaypoints.length) {
            return res.status(400).json({ message: 'Invalid waypoint index' });
        }

        order.routeWaypoints[index].reached = reached;
        if (reached) {
            order.routeWaypoints[index].reachedAt = new Date();
        }

        await order.save();

        res.json({ message: 'Waypoint updated', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// User: Get enhanced tracking with route
router.get('/user/orders/:orderId/track-route', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ _id: orderId, userId: req.user.userId })
            .populate('deliveryPartner.partnerId', 'name phone vehicle rating');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Build full route including packaging point, waypoints, and destination
        const fullRoute = [];

        if (order.packagingPoint?.coordinates) {
            fullRoute.push({
                type: 'packaging',
                name: order.packagingPoint.name,
                coordinates: order.packagingPoint.coordinates,
                reached: true
            });
        }

        if (order.routeWaypoints) {
            fullRoute.push(...order.routeWaypoints.map(wp => ({
                type: 'waypoint',
                name: wp.name,
                coordinates: wp.coordinates,
                reached: wp.reached,
                reachedAt: wp.reachedAt
            })));
        }

        if (order.shippingAddress?.coordinates) {
            fullRoute.push({
                type: 'destination',
                name: 'Delivery Address',
                address: `${order.shippingAddress.street}, ${order.shippingAddress.city}`,
                coordinates: order.shippingAddress.coordinates,
                reached: order.status === 'delivered'
            });
        }

        res.json({
            orderId: order._id,
            status: order.status,
            fullRoute,
            packagingPoint: order.packagingPoint,
            waypoints: order.routeWaypoints,
            deliveryPartner: order.deliveryPartner,
            currentLocation: order.deliveryPartner?.currentLocation,
            deliveryTiming: order.deliveryTiming,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            items: order.items,
            totalAmount: order.totalAmount
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============== SUPER ADMIN: TRACKING TOGGLE ==============

// Get tracking status (public - no auth needed)
router.get('/settings/tracking', async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json({ trackingEnabled: settings.trackingEnabled });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Toggle tracking (Super Admin only)
router.put('/admin/settings/tracking', authenticateAdminToken, async (req, res) => {
    try {
        const { enabled } = req.body;

        // Check if admin is super admin
        const Admin = require('../models/Admin.js');
        const admin = await Admin.findById(req.admin.id);

        if (!admin || admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only super admin can toggle tracking' });
        }

        const settings = await Settings.updateTracking(enabled, req.admin.id);

        res.json({
            message: `Tracking ${enabled ? 'enabled' : 'disabled'} successfully`,
            trackingEnabled: settings.trackingEnabled
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== MAIL SYSTEM ====================

// Admin: Send mail to user
router.post('/admin/mails', authenticateAdminToken, async (req, res) => {
    try {
        const { userId, subject, message } = req.body;

        if (!userId || !subject || !message) {
            return res.status(400).json({ message: 'User, subject, and message are required' });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const mail = new Mail({
            from: req.admin.id,
            to: userId,
            subject,
            message
        });

        await mail.save();

        // Emit real-time notification to user
        const { sendMailNotification } = require('../socketHandler.js');
        sendMailNotification(userId, {
            _id: mail._id,
            subject: mail.subject,
            message: mail.message,
            type: mail.type || 'normal',
            createdAt: mail.createdAt
        });

        res.status(201).json({
            message: 'Mail sent successfully',
            mail: {
                _id: mail._id,
                subject: mail.subject,
                to: { name: user.name, email: user.email },
                createdAt: mail.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Get all sent mails
router.get('/admin/mails', authenticateAdminToken, async (req, res) => {
    try {
        const mails = await Mail.find()
            .populate('to', 'name email')
            .populate('from', 'username')
            .sort({ createdAt: -1 });

        res.json(mails);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Search users for mail recipient
router.get('/admin/users/search', authenticateAdminToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 1) {
            return res.json([]);
        }

        const users = await User.find({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { phone: { $regex: q, $options: 'i' } }
            ]
        }).select('name email phone').limit(10);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// User: Get my mails
router.get('/user/mails', authenticateToken, async (req, res) => {
    try {
        const mails = await Mail.find({ to: req.user.userId })
            .populate('from', 'username')
            .sort({ createdAt: -1 });

        const unreadCount = mails.filter(m => !m.read).length;

        res.json({ mails, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// User: Mark mail as read
router.put('/user/mails/:id/read', authenticateToken, async (req, res) => {
    try {
        const mail = await Mail.findOne({ _id: req.params.id, to: req.user.userId });

        if (!mail) {
            return res.status(404).json({ message: 'Mail not found' });
        }

        if (!mail.read) {
            mail.read = true;
            mail.readAt = new Date();
            await mail.save();
        }

        res.json({ message: 'Mail marked as read', mail });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// User: Delete mail (only if read)
router.delete('/user/mails/:id', authenticateToken, async (req, res) => {
    try {
        const mail = await Mail.findOne({ _id: req.params.id, to: req.user.userId });

        if (!mail) {
            return res.status(404).json({ message: 'Mail not found' });
        }

        if (!mail.read) {
            return res.status(400).json({ message: 'Please read the mail before deleting' });
        }

        await Mail.findByIdAndDelete(mail._id);

        res.json({ message: 'Mail deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Broadcast mail to all users (Super Admin only)
router.post('/admin/mails/broadcast', authenticateAdminToken, async (req, res) => {
    try {
        const { subject, message } = req.body;

        // Verify super admin role
        const Admin = require('../models/Admin.js');
        const admin = await Admin.findById(req.admin.id);

        if (!admin || admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only Super Admin can broadcast messages' });
        }

        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        // Get all users with email and name
        const users = await User.find({}).select('_id name email');

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        console.log(`📢 Broadcasting message to ${users.length} users...`);

        // Create mail for each user
        const mailPromises = users.map(user => {
            const mail = new Mail({
                from: req.admin.id,
                to: user._id,
                subject,
                message,
                type: 'normal'
            });
            return mail.save();
        });

        const savedMails = await Promise.all(mailPromises);

        // Send real-time notifications to all users
        const { sendMailNotification } = require('../socketHandler.js');
        savedMails.forEach(mail => {
            sendMailNotification(mail.to.toString(), {
                _id: mail._id,
                subject: mail.subject,
                message: mail.message,
                type: mail.type,
                createdAt: mail.createdAt
            });
        });

        console.log(`✅ In-app notifications sent to ${users.length} users`);

        // Send emails to all users (async, don't wait for completion)
        const { sendBroadcastEmail } = require('../config/emailConfig.js');
        let emailsSent = 0;
        let emailsFailed = 0;

        console.log(`📧 Sending emails to ${users.length} users...`);

        // Send emails in batches to avoid overwhelming the email server
        const batchSize = 10;
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            const emailPromises = batch.map(async (user) => {
                try {
                    const result = await sendBroadcastEmail(user.email, user.name, subject, message);
                    if (result.success) {
                        emailsSent++;
                    } else {
                        emailsFailed++;
                    }
                } catch (error) {
                    emailsFailed++;
                    console.error(`Failed to send email to ${user.email}:`, error.message);
                }
            });
            await Promise.all(emailPromises);
            // Small delay between batches
            if (i + batchSize < users.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`✅ Broadcast completed: ${emailsSent} emails sent, ${emailsFailed} failed`);

        res.status(201).json({
            message: `Broadcast sent successfully to ${users.length} users`,
            count: users.length,
            subject: subject,
            emailStats: {
                sent: emailsSent,
                failed: emailsFailed
            }
        });
    } catch (error) {
        console.error('❌ Broadcast error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ SERVER MAINTENANCE MODE ============

// Public: Get server status (maintenance mode)
router.get('/server/status', async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json({
            maintenanceMode: settings.maintenanceMode,
            status: settings.maintenanceMode ? 'offline' : 'online'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin (Super Admin Only): Toggle maintenance mode
router.post('/admin/server/maintenance', authenticateAdminToken, async (req, res) => {
    try {
        const { enabled } = req.body;

        // Get admin to verify super_admin role
        const Admin = require('../models/Admin.js');
        const admin = await Admin.findById(req.admin.id);

        if (!admin || admin.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only Super Admin can toggle maintenance mode' });
        }

        const settings = await Settings.updateMaintenanceMode(enabled, req.admin.id);

        res.json({
            message: enabled ? 'Server is now in maintenance mode' : 'Server is back online',
            maintenanceMode: settings.maintenanceMode,
            status: settings.maintenanceMode ? 'offline' : 'online',
            updatedAt: settings.updatedAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============== GAMIFICATION SYSTEM ==============

// Achievement definitions
const ACHIEVEMENTS = {
    first_purchase: {
        id: 'first_purchase',
        name: 'First Purchase',
        description: 'Complete your first order',
        icon: 'ShoppingBag',
        points: 50,
        category: 'shopping'
    },
    century_club: {
        id: 'century_club',
        name: 'Century Club',
        description: 'Spend ₹10,000 total',
        icon: 'Target',
        points: 200,
        category: 'shopping'
    },
    frequent_shopper: {
        id: 'frequent_shopper',
        name: 'Frequent Shopper',
        description: '10 orders in a month',
        icon: 'TrendingUp',
        points: 150,
        category: 'shopping'
    },
    vip_shopper: {
        id: 'vip_shopper',
        name: 'VIP Shopper',
        description: '50 total orders',
        icon: 'Crown',
        points: 300,
        category: 'shopping'
    },
    week_warrior: {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: '7-day check-in streak',
        icon: 'CalendarCheck',
        points: 100,
        category: 'engagement'
    },
    month_master: {
        id: 'month_master',
        name: 'Month Master',
        description: '30-day check-in streak',
        icon: 'Flame',
        points: 500,
        category: 'engagement'
    },
    review_expert: {
        id: 'review_expert',
        name: 'Review Expert',
        description: 'Write 10 reviews',
        icon: 'Star',
        points: 150,
        category: 'engagement'
    },
    early_bird: {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Order before 7 AM',
        icon: 'Sunrise',
        points: 50,
        category: 'special'
    },
    night_owl: {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Order after 10 PM',
        icon: 'Moon',
        points: 50,
        category: 'special'
    }
};

// Reward catalog
const REWARDS = [
    { id: 'discount_10', name: '₹10 Discount Coupon', pointsCost: 100, value: 10, type: 'discount' },
    { id: 'discount_30', name: '₹30 Discount Coupon', pointsCost: 250, value: 30, type: 'discount' },
    { id: 'discount_75', name: '₹75 Discount Coupon', pointsCost: 500, value: 75, type: 'discount' },
    { id: 'discount_200', name: '₹200 Discount Coupon', pointsCost: 1000, value: 200, type: 'discount' },
    { id: 'free_delivery_month', name: 'Free Delivery for a Month', pointsCost: 2000, value: 0, type: 'free_delivery' },
    { id: 'premium_upgrade', name: 'Premium Membership Upgrade', pointsCost: 5000, value: 0, type: 'premium' }
];

// Initialize gamification for user
const initializeGamification = async (userId) => {
    let gamification = await Gamification.findOne({ userId });

    if (!gamification) {
        gamification = new Gamification({ userId });
        await gamification.save();
    }

    return gamification;
};

// Daily check-in
router.post('/gamification/check-in', authenticateToken, async (req, res) => {
    try {
        let gamification = await initializeGamification(req.user.userId);

        const result = gamification.dailyCheckIn();

        // If check-in failed (already checked in today), return early
        if (!result.success) {
            return res.json(result);
        }

        // Check for streak achievements
        if (gamification.checkInStreak === 7) {
            gamification.checkAchievement('week_warrior', ACHIEVEMENTS.week_warrior);
        }
        if (gamification.checkInStreak === 30) {
            gamification.checkAchievement('month_master', ACHIEVEMENTS.month_master);
        }

        // Save once after all operations
        await gamification.save();

        res.json({
            success: result.success,
            message: result.message || `Checked in! Earned ${result.points} points`,
            points: result.points,
            streak: result.streak,
            totalPoints: gamification.points,
            level: gamification.level,
            levelName: gamification.levelName
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user's gamification stats
router.get('/gamification/stats', authenticateToken, async (req, res) => {
    try {
        let gamification = await initializeGamification(req.user.userId);

        // Calculate progress to next level
        const levelThresholds = [0, 101, 301, 601, 1001, 1501];
        const currentLevelThreshold = levelThresholds[gamification.level - 1];
        const nextLevelThreshold = levelThresholds[gamification.level] || 2000;
        const progressToNextLevel = ((gamification.points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;

        res.json({
            points: gamification.points,
            level: gamification.level,
            levelName: gamification.levelName,
            progressToNextLevel: Math.min(progressToNextLevel, 100),
            nextLevelThreshold,
            achievements: gamification.achievements,
            achievementCount: gamification.achievements.length,
            checkInStreak: gamification.checkInStreak,
            lastCheckIn: gamification.lastCheckIn,
            totalOrders: gamification.totalOrders,
            totalSpent: gamification.totalSpent,
            reviewsWritten: gamification.reviewsWritten,
            pointHistory: gamification.pointHistory.slice(-10).reverse() // Last 10 transactions
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get leaderboard
router.get('/gamification/leaderboard', async (req, res) => {
    try {
        const { period = 'all' } = req.query;

        let leaderboard;

        if (period === 'all') {
            // All-time leaderboard
            leaderboard = await Gamification.find()
                .sort({ points: -1 })
                .limit(50)
                .populate('userId', 'name email')
                .select('userId points level levelName achievements');
        } else if (period === 'monthly') {
            // Monthly leaderboard (points earned this month)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const allGamification = await Gamification.find()
                .populate('userId', 'name email');

            leaderboard = allGamification.map(g => {
                const monthlyPoints = g.pointHistory
                    .filter(p => p.createdAt >= startOfMonth && p.type === 'earn')
                    .reduce((sum, p) => sum + p.amount, 0);

                return {
                    userId: g.userId,
                    points: monthlyPoints,
                    level: g.level,
                    levelName: g.levelName,
                    achievements: g.achievements
                };
            })
                .filter(g => g.points > 0)
                .sort((a, b) => b.points - a.points)
                .slice(0, 50);
        } else if (period === 'weekly') {
            // Weekly leaderboard
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - 7);
            startOfWeek.setHours(0, 0, 0, 0);

            const allGamification = await Gamification.find()
                .populate('userId', 'name email');

            leaderboard = allGamification.map(g => {
                const weeklyPoints = g.pointHistory
                    .filter(p => p.createdAt >= startOfWeek && p.type === 'earn')
                    .reduce((sum, p) => sum + p.amount, 0);

                return {
                    userId: g.userId,
                    points: weeklyPoints,
                    level: g.level,
                    levelName: g.levelName,
                    achievements: g.achievements
                };
            })
                .filter(g => g.points > 0)
                .sort((a, b) => b.points - a.points)
                .slice(0, 50);
        }

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all achievements
router.get('/gamification/achievements', async (req, res) => {
    try {
        res.json(Object.values(ACHIEVEMENTS));
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get available rewards
router.get('/gamification/rewards', async (req, res) => {
    try {
        res.json(REWARDS);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Redeem reward
router.post('/gamification/redeem', authenticateToken, async (req, res) => {
    try {
        const { rewardId } = req.body;

        const reward = REWARDS.find(r => r.id === rewardId);
        if (!reward) {
            return res.status(404).json({ message: 'Reward not found' });
        }

        let gamification = await initializeGamification(req.user.userId);

        console.log('=== REDEEM START ===');
        console.log(`User ID: ${req.user.userId}`);
        console.log(`Reward: ${reward.name} (${reward.pointsCost} points)`);
        console.log(`BEFORE - Points: ${gamification.points}`);
        console.log(`BEFORE - Redeemed Rewards: ${gamification.redeemedRewards.length}`);

        if (gamification.points < reward.pointsCost) {
            console.log(`INSUFFICIENT POINTS: Need ${reward.pointsCost}, Have ${gamification.points}`);
            return res.status(400).json({
                message: 'Insufficient points',
                required: reward.pointsCost,
                current: gamification.points
            });
        }

        // Set expiration date (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Redeem points and add reward
        console.log('Calling redeemPoints()...');
        gamification.redeemPoints(reward.pointsCost, {
            ...reward,
            expiresAt
        });

        console.log(`AFTER redeemPoints() - Points: ${gamification.points}`);
        console.log(`AFTER redeemPoints() - Redeemed Rewards: ${gamification.redeemedRewards.length}`);
        console.log(`Modified paths: ${gamification.modifiedPaths()}`);
        console.log(`Is modified: ${gamification.isModified()}`);

        // Save the gamification document to persist changes
        console.log('Calling save()...');
        await gamification.save();
        console.log('Save completed!');

        // Verify the save worked by fetching fresh from DB
        const verifyGamification = await Gamification.findOne({ userId: req.user.userId });
        console.log(`VERIFY from DB - Points: ${verifyGamification.points}`);
        console.log(`VERIFY from DB - Redeemed Rewards: ${verifyGamification.redeemedRewards.length}`);
        console.log('=== REDEEM END ===\n');

        res.json({
            message: `Successfully redeemed ${reward.name}!`,
            pointsRemaining: gamification.points,
            reward: {
                ...reward,
                expiresAt
            }
        });
    } catch (error) {
        console.error('=== REDEEM ERROR ===');
        console.error(error);
        console.error('===================\n');
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user's redeemed rewards
router.get('/gamification/my-rewards', authenticateToken, async (req, res) => {
    try {
        let gamification = await initializeGamification(req.user.userId);

        // Filter out expired and used rewards
        const activeRewards = gamification.redeemedRewards.filter(r => {
            return !r.usedAt && (!r.expiresAt || new Date(r.expiresAt) > new Date());
        });

        res.json(activeRewards);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ===== GIFT CODE SYSTEM =====

// Redeem points for gift code
router.post('/gamification/redeem-gift-code', authenticateToken, async (req, res) => {
    try {
        const { rewardId, pointCost, discountAmount } = req.body;

        if (!rewardId || !pointCost || !discountAmount) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Get user's gamification profile
        const gamification = await Gamification.findOne({ userId: req.user.userId });
        if (!gamification) {
            return res.status(404).json({ message: 'Gamification profile not found' });
        }

        // Check if user has enough points
        if (gamification.points < pointCost) {
            return res.status(400).json({
                message: 'Insufficient points',
                required: pointCost,
                current: gamification.points
            });
        }

        // Deduct points
        gamification.points -= pointCost;
        gamification.pointHistory.push({
            amount: -pointCost,
            reason: `Redeemed gift code: ₹${discountAmount} discount`,
            type: 'redeem'
        });
        gamification.markModified('pointHistory');
        await gamification.save();

        // Create gift code
        const giftCode = await GiftCode.createGiftCode(req.user.userId, discountAmount);

        res.json({
            message: 'Gift code created successfully!',
            code: giftCode.code,
            discountAmount: giftCode.discountAmount,
            expiresAt: giftCode.expiresAt,
            pointsRemaining: gamification.points
        });
    } catch (error) {
        console.error('Error redeeming gift code:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user's gift codes
router.get('/gift-codes/my-codes', authenticateToken, async (req, res) => {
    try {
        const codes = await GiftCode.find({
            userId: req.user.userId
        }).sort({ createdAt: -1 });

        res.json({ codes });
    } catch (error) {
        console.error('Error fetching gift codes:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Validate gift code
router.get('/gift-codes/validate/:code', authenticateToken, async (req, res) => {
    try {
        const code = await GiftCode.findOne({
            code: req.params.code,
            userId: req.user.userId,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (!code) {
            return res.status(404).json({ message: 'Invalid, expired, or already used code' });
        }

        res.json({
            code: code.code,
            discountAmount: code.discountAmount,
            expiresAt: code.expiresAt
        });
    } catch (error) {
        console.error('Error validating gift code:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Migration endpoint - Add sample coordinates to orders
router.post('/admin/migrate-order-coordinates', async (req, res) => {
    try {
        // Sample coordinates for different cities in India
        const sampleLocations = [
            { lat: 19.0760, lng: 72.8777, city: 'Mumbai' },
            { lat: 28.7041, lng: 77.1025, city: 'Delhi' },
            { lat: 12.9716, lng: 77.5946, city: 'Bangalore' },
            { lat: 22.5726, lng: 88.3639, city: 'Kolkata' },
            { lat: 17.3850, lng: 78.4867, city: 'Hyderabad' },
            { lat: 13.0827, lng: 80.2707, city: 'Chennai' },
            { lat: 23.0225, lng: 72.5714, city: 'Ahmedabad' },
            { lat: 18.5204, lng: 73.8567, city: 'Pune' }
        ];

        // Find orders without coordinates
        const orders = await Order.find({
            $or: [
                { 'shippingAddress.coordinates': { $exists: false } },
                { 'shippingAddress.coordinates.lat': { $exists: false } }
            ]
        });

        let updated = 0;
        for (const order of orders) {
            // Pick a random location
            const location = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];

            // Add some random offset to make each order unique
            const latOffset = (Math.random() - 0.5) * 0.1; // ±0.05 degrees
            const lngOffset = (Math.random() - 0.5) * 0.1;

            if (!order.shippingAddress) {
                order.shippingAddress = {};
            }

            order.shippingAddress.coordinates = {
                lat: location.lat + latOffset,
                lng: location.lng + lngOffset
            };

            if (!order.shippingAddress.city) {
                order.shippingAddress.city = location.city;
                order.shippingAddress.state = 'India';
            }

            await order.save({ validateBeforeSave: false });
            updated++;
        }

        res.json({
            message: 'Migration completed successfully',
            ordersUpdated: updated,
            totalOrders: orders.length
        });
    } catch (error) {
        console.error('Migration error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Migration failed', error: error.message, stack: error.stack });
    }
});

// ============ SUPPORT CHAT SYSTEM ============

// Request support chat (creates a pending chat request)
router.post('/user/support/request', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check if user already has an active or pending support chat
        const existingChat = await SupportChat.findOne({
            user: userId,
            status: { $in: ['pending', 'active'] }
        });

        if (existingChat) {
            return res.status(400).json({
                message: existingChat.status === 'pending'
                    ? 'You already have a pending support request'
                    : 'You already have an active chat with support',
                chatId: existingChat._id
            });
        }

        // Create new support chat request
        const supportChat = new SupportChat({
            user: userId,
            status: 'pending',
            messages: [{
                sender: userId,
                senderModel: 'User',
                message: req.body.initialMessage || 'Hello, I need help with my account.',
                timestamp: new Date()
            }]
        });

        await supportChat.save();

        // Get user info for notification
        const user = await User.findById(userId).select('name email');

        // Send real-time notification to all admins via WebSocket
        const { broadcastSupportRequest } = require('../socketHandler.js');
        broadcastSupportRequest({
            id: supportChat._id,
            user: { _id: userId, name: user?.name, email: user?.email },
            firstMessage: req.body.initialMessage || 'Hello, I need help with my account.',
            createdAt: supportChat.createdAt
        });

        console.log(`📧 Support request from ${user?.name || userId} - Broadcast to all admins`);

        res.status(201).json({
            message: 'Support request sent successfully! An admin will connect with you shortly.',
            chatId: supportChat._id,
            status: supportChat.status
        });
    } catch (error) {
        console.error('Support request error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user's active support chat
router.get('/user/support/active', authenticateToken, async (req, res) => {
    try {
        const chat = await SupportChat.findOne({
            user: req.user.userId,
            status: { $in: ['pending', 'active'] }
        }).populate('admin', 'name email');

        if (!chat) {
            return res.json({ hasActiveChat: false });
        }

        res.json({
            hasActiveChat: true,
            chat: {
                id: chat._id,
                status: chat.status,
                admin: chat.admin ? { name: chat.admin.name } : null,
                messagesCount: chat.messages.length,
                createdAt: chat.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get chat messages
router.get('/user/support/chat/:chatId/messages', authenticateToken, async (req, res) => {
    try {
        const chat = await SupportChat.findOne({
            _id: req.params.chatId,
            user: req.user.userId
        }).populate('admin', 'name');

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.json({
            chatId: chat._id,
            status: chat.status,
            admin: chat.admin ? { name: chat.admin.name } : null,
            messages: chat.messages.map(msg => ({
                id: msg._id,
                sender: msg.senderModel,
                message: msg.message,
                timestamp: msg.timestamp
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Send message in chat
router.post('/user/support/chat/:chatId/message', authenticateToken, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Message cannot be empty' });
        }

        const chat = await SupportChat.findOne({
            _id: req.params.chatId,
            user: req.user.userId,
            status: 'active'
        });

        if (!chat) {
            return res.status(404).json({ message: 'Active chat not found' });
        }

        const newMessage = {
            sender: req.user.userId,
            senderModel: 'User',
            message: message.trim(),
            timestamp: new Date()
        };

        chat.messages.push(newMessage);
        await chat.save();

        // Send real-time notification to admin via WebSocket
        const { broadcastSupportMessage } = require('../socketHandler.js');
        broadcastSupportMessage(req.user.userId, chat.admin, {
            chatId: chat._id,
            sender: 'User',
            message: newMessage.message,
            timestamp: newMessage.timestamp
        });

        res.json({
            success: true,
            message: 'Message sent',
            newMessage: chat.messages[chat.messages.length - 1]
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Close support chat
router.post('/user/support/chat/:chatId/close', authenticateToken, async (req, res) => {
    try {
        const chat = await SupportChat.findOne({
            _id: req.params.chatId,
            user: req.user.userId,
            status: { $in: ['pending', 'active'] }
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        chat.status = 'closed';
        chat.closedAt = new Date();
        chat.closedBy = 'user';

        await chat.save();

        res.json({
            success: true,
            message: 'Support chat closed successfully'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user's chat history
router.get('/user/support/history', authenticateToken, async (req, res) => {
    try {
        const chats = await SupportChat.find({
            user: req.user.userId
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('status createdAt closedAt messagesCount');

        res.json({ chats });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ NOTIFICATION COUNT ENDPOINTS ============

// Get pending orders count (for admin notification badge)
router.get('/orders/pending-count', authenticateAdminToken, async (req, res) => {
    try {
        const count = await Order.countDocuments({
            status: { $in: ['pending', 'confirmed'] }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get pending support requests count (for admin notification badge)
router.get('/support/pending-count', authenticateAdminToken, async (req, res) => {
    try {
        const count = await SupportChat.countDocuments({ status: 'pending' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;