const express = require('express');
const router = express.Router();
const User = require('../models/User.js');
const Order = require('../models/Order.js');
const Product = require('../models/Product.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
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
            price: BADGE_PRICES[badgeType]
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

module.exports = router;