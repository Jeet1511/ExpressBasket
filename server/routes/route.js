const express = require('express');
const router = express.Router();
const User = require('../models/User.js');
const Order = require('../models/Order.js');
const Product = require('../models/Product.js');
const Settings = require('../models/Settings.js');
const Mail = require('../models/Mail.js');
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

// Update user profile
router.put('/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { name, phone, address },
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
        const { items, shippingAddress, paymentMethod } = req.body;

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

        // Create order
        const order = new Order({
            userId: req.user.userId,
            items: orderItems,
            totalAmount,
            shippingAddress,
            paymentMethod: paymentMethod || 'cod'
        });

        await order.save();

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

// Get user orders (User only)
router.get('/user/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.userId })
            .sort({ orderDate: -1 });
        res.json(orders);
    } catch (error) {
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

// Pay via friend's wallet
router.post('/user/wallet/pay-friend', authenticateToken, async (req, res) => {
    try {
        const { friendId, amount, orderId, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (!friendId) {
            return res.status(400).json({ message: 'Friend ID is required' });
        }

        const friend = await User.findById(friendId);
        if (!friend) {
            return res.status(404).json({ message: 'Friend not found' });
        }

        if ((friend.walletBalance || 0) < amount) {
            return res.status(400).json({
                message: `${friend.name}'s wallet has insufficient balance`,
                balance: friend.walletBalance || 0,
                required: amount
            });
        }

        const user = await User.findById(req.user.userId);

        // Deduct from friend's wallet
        friend.walletBalance -= amount;
        friend.walletHistory = friend.walletHistory || [];
        friend.walletHistory.push({
            type: 'friend_payment',
            amount: -amount,
            description: `Payment for ${user.name}'s order`,
            friendId: user._id,
            orderId: orderId,
            createdAt: new Date()
        });

        await friend.save();

        res.json({
            success: true,
            message: `Payment of ₹${amount} made through ${friend.name}'s wallet!`,
            friendName: friend.name
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

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Set token and expiration (1 hour)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // Send email
        const emailResult = await sendPasswordResetEmail(email, resetToken, user.name);

        if (!emailResult.success) {
            return res.status(500).json({ message: 'Failed to send email. Please try again.' });
        }

        res.json({
            message: 'Password reset email sent successfully! Check your inbox.',
            email: email
        });
    } catch (error) {
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
router.put('/admin/orders/:orderId/status', authenticateAdminToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, message } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
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
        }

        await order.save();

        res.json({ message: 'Order status updated', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin: Assign delivery partner
router.post('/admin/orders/:orderId/assign-partner', authenticateAdminToken, async (req, res) => {
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
router.post('/admin/delivery-partners', authenticateAdminToken, async (req, res) => {
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
router.post('/admin/orders/:orderId/set-route', authenticateAdminToken, async (req, res) => {
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

        if (!admin || admin.role !== 'superadmin') {
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

module.exports = router;