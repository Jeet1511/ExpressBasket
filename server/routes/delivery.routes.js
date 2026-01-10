const express = require('express');
const router = express.Router();
const DeliveryPartner = require('../models/DeliveryPartner.js');
const Delivery = require('../models/Delivery.js');
const Order = require('../models/Order.js');
const jwt = require('jsonwebtoken');
const { sendDeliveryAssignment, broadcastDeliveryStatus, sendDeliveryCompleted } = require('../socketHandler.js');
const { findNearestHub, generateDeliveryTime, calculateExpectedArrival, calculateDistance } = require('../utils/hubSelection.js');

console.log('📦 Delivery routes loaded - version 2.0 (fixed hub distance)');

// Auth middleware (copied from route.js)
const authenticateAdminToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// ==================== PARTNER AUTH ROUTES ====================

// Partner registration (self-signup)
router.post('/partner/register', async (req, res) => {
    try {
        const { name, email, phone, password, vehicle } = req.body;

        // Check if partner already exists
        const existingPartner = await DeliveryPartner.findOne({ email });
        if (existingPartner) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create new partner (not approved by default)
        const partner = new DeliveryPartner({
            name,
            email,
            phone,
            password, // In production, hash this with bcrypt
            vehicle,
            isApproved: false
        });

        await partner.save();

        res.status(201).json({
            message: 'Application submitted successfully. Please wait for admin approval.',
            partnerId: partner._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Partner login
router.post('/partner/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const partner = await DeliveryPartner.findOne({ email });
        if (!partner) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if approved
        if (!partner.isApproved) {
            return res.status(403).json({
                message: 'Your application is pending admin approval. Please wait for confirmation email.'
            });
        }

        // In production, use bcrypt to compare passwords
        if (partner.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { partnerId: partner._id, type: 'partner' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            partner: {
                _id: partner._id,
                name: partner.name,
                email: partner.email,
                phone: partner.phone,
                vehicle: partner.vehicle,
                rating: partner.rating,
                totalDeliveries: partner.totalDeliveries,
                isAvailable: partner.isAvailable,
                isApproved: partner.isApproved,
                createdAt: partner.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Partner auth middleware
const authenticatePartnerToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (verified.type !== 'partner') {
            return res.status(403).json({ message: 'Not a partner token' });
        }
        req.partner = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Get partner's deliveries
router.get('/partner/deliveries', authenticatePartnerToken, async (req, res) => {
    try {
        const deliveries = await Delivery.find({
            deliveryPartner: req.partner.partnerId
        })
            .populate({
                path: 'order',
                populate: { path: 'userId', select: 'name phone' },
                // Include all order fields for map display
                select: '_id totalAmount status userId assignedHub shippingAddress deliveryLocation deliveryProgress estimatedDeliveryMinutes'
            })
            .sort({ assignedAt: -1 });

        res.json(deliveries);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get partner's profile
router.get('/partner/profile', authenticatePartnerToken, async (req, res) => {
    try {
        const partner = await DeliveryPartner.findById(req.partner.partnerId)
            .select('-password');

        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.json(partner);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Toggle partner online/offline status
router.put('/partner/toggle-online', authenticatePartnerToken, async (req, res) => {
    try {
        const { isOnline } = req.body;
        const partnerId = req.partner.partnerId;

        const partner = await DeliveryPartner.findByIdAndUpdate(
            partnerId,
            { isAvailable: isOnline },
            { new: true }
        ).select('-password');

        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        // Broadcast status change via socket (if socket handler supports it)
        try {
            const { broadcastPartnerStatus } = require('../socketHandler.js');
            if (broadcastPartnerStatus) {
                broadcastPartnerStatus(partnerId, isOnline);
            }
        } catch (e) {
            // Socket broadcast not critical, continue
        }

        res.json({
            message: isOnline ? 'You are now online' : 'You are now offline',
            isAvailable: partner.isAvailable,
            partner
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ADMIN ROUTES ====================

// Get available (online) delivery partners for assignment
router.get('/admin/available-partners', authenticateAdminToken, async (req, res) => {
    try {
        // Only return partners who are: approved, active, and online (available)
        const partners = await DeliveryPartner.find({
            isApproved: true,
            isActive: true,
            isAvailable: true
        })
            .select('-password')
            .sort({ rating: -1, totalDeliveries: -1 });

        res.json(partners);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// Get all delivery partners
router.get('/admin/delivery-partners', authenticateAdminToken, async (req, res) => {
    try {
        const partners = await DeliveryPartner.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(partners);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add new delivery partner
router.post('/admin/delivery-partners', authenticateAdminToken, async (req, res) => {
    try {
        const { name, email, phone, password, vehicle } = req.body;

        // Check if partner already exists
        const existingPartner = await DeliveryPartner.findOne({ email });
        if (existingPartner) {
            return res.status(400).json({ message: 'Partner with this email already exists' });
        }

        const partner = new DeliveryPartner({
            name,
            email,
            phone,
            password, // In production, hash this!
            vehicle
        });

        await partner.save();

        res.status(201).json({
            message: 'Delivery partner added successfully',
            partner: {
                _id: partner._id,
                name: partner.name,
                email: partner.email,
                phone: partner.phone,
                vehicle: partner.vehicle
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update delivery partner
router.put('/admin/delivery-partners/:id', authenticateAdminToken, async (req, res) => {
    try {
        const { name, phone, vehicle, isAvailable, isActive, isApproved } = req.body;

        const partner = await DeliveryPartner.findByIdAndUpdate(
            req.params.id,
            { name, phone, vehicle, isAvailable, isActive, isApproved },
            { new: true }
        ).select('-password');

        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.json({ message: 'Partner updated successfully', partner });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete delivery partner
router.delete('/admin/delivery-partners/:id', authenticateAdminToken, async (req, res) => {
    try {
        const partner = await DeliveryPartner.findByIdAndDelete(req.params.id);

        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.json({ message: 'Partner deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Assign delivery to partner
router.post('/admin/delivery/assign', authenticateAdminToken, async (req, res) => {
    try {
        const { orderId, partnerId } = req.body;

        console.log('📦 Assign delivery request:', { orderId, partnerId });

        // Validate input
        if (!orderId || !partnerId) {
            return res.status(400).json({ message: 'orderId and partnerId are required' });
        }

        // Get order details with user populated
        const order = await Order.findById(orderId).populate('userId');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        console.log('📦 Order found:', order._id, 'Status:', order.status);

        // Validate order status - must be 'packed' before assignment
        if (order.status !== 'packed') {
            return res.status(400).json({
                message: `Cannot assign delivery. Order must be 'packed' status. Current status: ${order.status}`,
                currentStatus: order.status
            });
        }

        // Get partner details
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        console.log('📦 Partner found:', partner.name, 'Available:', partner.isAvailable);

        // Validate partner is approved, active, and available (online)
        if (!partner.isApproved) {
            return res.status(400).json({ message: 'Partner is not approved' });
        }
        if (!partner.isActive) {
            return res.status(400).json({ message: 'Partner account is inactive' });
        }
        if (!partner.isAvailable) {
            return res.status(400).json({ message: 'Partner is currently offline. Please select an online partner.' });
        }

        // Calculate delivery time - simple random time
        let estimatedMinutes = 30 + Math.floor(Math.random() * 25); // 30-55 mins default

        // Try to get membership-based time
        try {
            const membershipTier = order.userId?.membershipTier ||
                order.userId?.loyaltyBadge?.type ||
                'none';
            const membershipTime = generateDeliveryTime(membershipTier);
            if (membershipTime) {
                estimatedMinutes = membershipTime;
            }
        } catch (e) {
            console.log('📦 Using default delivery time');
        }

        order.estimatedDeliveryMinutes = estimatedMinutes;
        console.log('📦 Estimated delivery time:', estimatedMinutes, 'mins');

        // Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        // Build full delivery address safely
        const addr = order.shippingAddress || {};
        const fullAddress = [
            addr.houseNo,
            addr.street,
            addr.landmark,
            addr.city,
            addr.state,
            addr.pincode
        ].filter(Boolean).join(', ') || 'Address not provided';

        // Get coordinates safely with defaults
        const lat = addr.coordinates?.lat || order.deliveryLocation?.coordinates?.lat || 28.6139;
        const lng = addr.coordinates?.lng || order.deliveryLocation?.coordinates?.lng || 77.2090;

        // Create delivery with status 'pending_acceptance'
        const delivery = new Delivery({
            order: orderId,
            deliveryPartner: partnerId,
            status: 'pending_acceptance',
            deliveryLocation: {
                address: fullAddress,
                coordinates: { lat, lng }
            },
            otp,
            estimatedTime: estimatedMinutes
        });

        await delivery.save();
        console.log('📦 Delivery created:', delivery._id);

        // Update partner
        await DeliveryPartner.findByIdAndUpdate(partnerId, {
            currentDelivery: delivery._id,
            $push: { activeOrders: orderId }
        });

        // Update order status to 'assigned' (not out_for_delivery yet)
        order.status = 'assigned';
        order.assignedPartner = partnerId;
        await order.save();
        console.log('📦 Order status updated to assigned');

        // Send socket notification to partner
        const deliveryData = await Delivery.findById(delivery._id)
            .populate({
                path: 'order',
                populate: { path: 'userId', select: 'name phone' }
            })
            .populate('deliveryPartner');

        try {
            sendDeliveryAssignment(partnerId, deliveryData);
        } catch (socketErr) {
            console.log('📦 Socket notification error (non-critical):', socketErr.message);
        }

        // Notify customer that delivery partner is assigned
        const userId = order.userId?._id || order.userId;
        if (userId) {
            try {
                broadcastDeliveryStatus(userId, {
                    orderId,
                    status: 'assigned',
                    partnerName: partner.name,
                    message: 'Delivery partner assigned, waiting for acceptance'
                });
            } catch (socketErr) {
                console.log('📦 Customer notification error (non-critical):', socketErr.message);
            }
        }

        console.log('📦 Delivery assignment successful!');

        res.status(201).json({
            message: 'Delivery assigned successfully - waiting for partner acceptance',
            delivery: deliveryData,
            otp,
            estimatedDeliveryMinutes: estimatedMinutes
        });
    } catch (error) {
        console.error('❌ Assign delivery error:', error.message);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all active deliveries
router.get('/admin/delivery/active', authenticateAdminToken, async (req, res) => {
    try {
        const deliveries = await Delivery.find({
            status: { $in: ['assigned', 'picked_up', 'in_transit'] }
        })
            .populate('order')
            .populate('deliveryPartner')
            .sort({ assignedAt: -1 });

        res.json(deliveries);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get delivery by order ID
router.get('/admin/delivery/order/:orderId', authenticateAdminToken, async (req, res) => {
    try {
        const delivery = await Delivery.findOne({ order: req.params.orderId })
            .populate('deliveryPartner')
            .populate('order');

        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        res.json(delivery);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== DELIVERY PARTNER ROUTES ====================

// Accept delivery (starts the timer)
router.post('/delivery/accept', authenticatePartnerToken, async (req, res) => {
    try {
        const { deliveryId } = req.body;
        const partnerId = req.partner.partnerId;

        const delivery = await Delivery.findById(deliveryId)
            .populate({
                path: 'order',
                populate: { path: 'userId' }
            });

        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        // Verify partner
        if (delivery.deliveryPartner.toString() !== partnerId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Check if already accepted
        if (delivery.status !== 'pending_acceptance') {
            return res.status(400).json({ message: 'Delivery already accepted or completed' });
        }

        // Accept the delivery - DON'T start timer yet, wait for Start Delivery
        const now = new Date();
        delivery.status = 'accepted';
        delivery.acceptedAt = now;
        await delivery.save();

        // Keep order as 'assigned' - will change to out_for_delivery when partner starts delivery
        const order = delivery.order;
        // order stays as 'assigned' - no timer start yet

        // Set partner as unavailable (they have an active assignment)
        await DeliveryPartner.findByIdAndUpdate(partnerId, {
            isAvailable: false
        });

        // Notify customer - delivery has been accepted
        broadcastDeliveryStatus(order.userId._id, {
            orderId: order._id,
            status: 'accepted',
            message: 'Delivery partner has accepted your order and will pick it up soon!',
            estimatedTime: order.estimatedDeliveryMinutes
        });

        res.json({
            message: 'Delivery accepted successfully - timer started!',
            delivery,
            estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
            expectedArrivalTime: order.expectedArrivalTime
        });
    } catch (error) {
        console.error('Accept delivery error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Reject delivery (partner declines the assignment)
router.post('/delivery/reject', authenticatePartnerToken, async (req, res) => {
    try {
        const { deliveryId, reason } = req.body;
        const partnerId = req.partner.partnerId;

        const delivery = await Delivery.findById(deliveryId)
            .populate({
                path: 'order',
                populate: { path: 'userId' }
            });

        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        // Verify partner
        if (delivery.deliveryPartner.toString() !== partnerId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Check if can still reject (only pending_acceptance)
        if (delivery.status !== 'pending_acceptance') {
            return res.status(400).json({
                message: 'Cannot reject. Delivery is already in progress or completed.',
                currentStatus: delivery.status
            });
        }

        // Update delivery status to rejected
        delivery.status = 'rejected';
        delivery.rejectedAt = new Date();
        delivery.rejectionReason = reason || 'No reason provided';
        await delivery.save();

        // Reset order status back to 'packed' so admin can reassign
        const order = delivery.order;
        order.status = 'packed';
        order.assignedPartner = null;
        order.deliveryPartner = null;
        await order.save();

        // Clear partner's assignment
        await DeliveryPartner.findByIdAndUpdate(partnerId, {
            currentDelivery: null,
            $pull: { activeOrders: order._id }
        });

        // Notify admin via socket (if available)
        try {
            const { broadcastToAdmins } = require('../socketHandler.js');
            if (broadcastToAdmins) {
                broadcastToAdmins('delivery_rejected', {
                    orderId: order._id,
                    deliveryId: delivery._id,
                    partnerId,
                    reason: delivery.rejectionReason,
                    message: 'Delivery partner rejected the assignment. Order is back to packed status.'
                });
            }
        } catch (e) {
            // Socket broadcast not critical
        }

        res.json({
            message: 'Delivery rejected. Order returned to packed status for reassignment.',
            delivery,
            order: {
                _id: order._id,
                status: order.status
            }
        });
    } catch (error) {
        console.error('Reject delivery error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update delivery status (for picked_up, in_transit)
router.post('/delivery/update-status', async (req, res) => {
    try {
        const { deliveryId, status, partnerId } = req.body;

        const delivery = await Delivery.findById(deliveryId)
            .populate({
                path: 'order',
                populate: { path: 'userId' }
            });

        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        // Verify partner
        if (delivery.deliveryPartner.toString() !== partnerId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Update delivery status
        delivery.status = status;
        const now = new Date();

        if (status === 'picked_up') {
            delivery.pickedUpAt = now;
            // Order stays as 'assigned' - partner has picked up but not started delivery yet
        } else if (status === 'in_transit') {
            delivery.inTransitAt = now;

            // NOW the order becomes out_for_delivery and timer starts!
            const order = delivery.order;
            order.status = 'out_for_delivery';
            order.deliveryStartTime = now;
            order.expectedArrivalTime = calculateExpectedArrival(now, order.estimatedDeliveryMinutes || 30);
            order.deliveryProgress = {
                startTime: now,
                estimatedDeliveryMinutes: order.estimatedDeliveryMinutes || 30,
                currentProgress: 0,
                lastUpdated: now
            };
            await order.save();

            console.log(`🚚 Order ${order._id.toString().slice(-6)} is now OUT FOR DELIVERY - timer started!`);
        }

        await delivery.save();

        // For picked_up status, order stays as 'assigned' - don't update order status
        // For in_transit, order was already updated above

        // Notify customer
        if (delivery.order?.userId?._id) {
            broadcastDeliveryStatus(delivery.order.userId._id, {
                orderId: delivery.order._id,
                status,
                message: getStatusMessage(status),
                timestamp: now
            });
        }

        res.json({
            message: `Status updated to ${status}${status === 'in_transit' ? ' - Delivery timer started!' : ''}`,
            delivery
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Helper function for status messages
function getStatusMessage(status) {
    const messages = {
        'picked_up': 'Order has been picked up from the store',
        'in_transit': 'Order is on the way to you',
        'delivered': 'Order has been delivered'
    };
    return messages[status] || 'Delivery status updated';
}

// Complete delivery with OTP
router.post('/delivery/complete', async (req, res) => {
    try {
        const { deliveryId, otp, partnerId } = req.body;

        const delivery = await Delivery.findById(deliveryId)
            .populate('order')
            .populate('deliveryPartner');

        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        // Verify partner
        if (delivery.deliveryPartner._id.toString() !== partnerId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Verify OTP
        if (delivery.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Update delivery
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        delivery.actualTime = Math.floor((delivery.deliveredAt - delivery.assignedAt) / 60000); // in minutes
        delivery.earnings = 30; // Award ₹30 for completed delivery
        delivery.earningsStatus = 'pending';
        await delivery.save();

        // Update order
        await Order.findByIdAndUpdate(delivery.order._id, {
            status: 'delivered'
        });

        // Update partner
        await DeliveryPartner.findByIdAndUpdate(partnerId, {
            currentDelivery: null,
            isAvailable: true,
            $pull: { activeOrders: delivery.order._id },
            $inc: { totalDeliveries: 1 }
        });

        // Notify customer
        sendDeliveryCompleted(delivery.order.userId, delivery);

        // Broadcast to admin panel for real-time status update
        try {
            const { broadcastOrderStatusChange } = require('../socketHandler.js');
            broadcastOrderStatusChange(delivery.order._id, 'delivered', {
                orderId: delivery.order._id,
                deliveryId: delivery._id,
                deliveredAt: delivery.deliveredAt
            });
        } catch (socketError) {
            console.error('Socket broadcast error:', socketError);
        }

        res.json({
            message: 'Delivery completed successfully',
            delivery
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get partner earnings summary
router.get('/delivery/partner/earnings', authenticatePartnerToken, async (req, res) => {
    try {
        const partnerId = req.partner.partnerId;

        // Get all deliveries for this partner
        const deliveries = await Delivery.find({ deliveryPartner: partnerId })
            .populate('order', '_id totalAmount')
            .sort({ createdAt: -1 });

        // Calculate earnings
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Filter deliveries with earnings
        const paidDeliveries = deliveries.filter(d =>
            (d.status === 'delivered' || d.status === 'cancelled') && d.earnings > 0
        );

        const totalEarnings = paidDeliveries.reduce((sum, d) => sum + (d.earnings || 0), 0);
        const pendingPayout = paidDeliveries
            .filter(d => d.earningsStatus === 'pending')
            .reduce((sum, d) => sum + (d.earnings || 0), 0);
        const completedPayouts = paidDeliveries
            .filter(d => d.earningsStatus === 'paid')
            .reduce((sum, d) => sum + (d.earnings || 0), 0);

        // Calculate by period
        const todayEarnings = paidDeliveries
            .filter(d => new Date(d.deliveredAt || d.cancelledAt || d.createdAt) >= todayStart)
            .reduce((sum, d) => sum + (d.earnings || 0), 0);
        const weekEarnings = paidDeliveries
            .filter(d => new Date(d.deliveredAt || d.cancelledAt || d.createdAt) >= weekStart)
            .reduce((sum, d) => sum + (d.earnings || 0), 0);
        const monthEarnings = paidDeliveries
            .filter(d => new Date(d.deliveredAt || d.cancelledAt || d.createdAt) >= monthStart)
            .reduce((sum, d) => sum + (d.earnings || 0), 0);

        // Get recent deliveries with earnings (last 20)
        const recentDeliveries = paidDeliveries.slice(0, 20).map(d => ({
            _id: d._id,
            orderId: d.order?._id,
            status: d.status,
            earnings: d.earnings,
            earningsStatus: d.earningsStatus,
            deliveredAt: d.deliveredAt,
            cancelledAt: d.cancelledAt,
            createdAt: d.createdAt
        }));

        res.json({
            totalEarnings,
            pendingPayout,
            completedPayouts,
            todayEarnings,
            weekEarnings,
            monthEarnings,
            recentDeliveries,
            totalDeliveries: paidDeliveries.length
        });
    } catch (error) {
        console.error('Error fetching partner earnings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== CUSTOMER ROUTES ====================

// Track delivery by order ID
router.get('/delivery/track/:orderId', async (req, res) => {
    try {
        const delivery = await Delivery.findOne({ order: req.params.orderId })
            .populate('deliveryPartner', 'name phone vehicle currentLocation')
            .populate('order');

        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found for this order' });
        }

        res.json({
            delivery,
            partnerLocation: delivery.deliveryPartner?.currentLocation,
            estimatedTime: delivery.estimatedTime,
            status: delivery.status
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Change hub for an order (admin only, before delivery starts)
router.put('/admin/order/:orderId/change-hub', authenticateAdminToken, async (req, res) => {
    try {
        const { hubId } = req.body;
        const { orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if order is already out for delivery
        if (order.status === 'out-for-delivery' || order.status === 'delivered') {
            return res.status(400).json({
                message: 'Cannot change hub once delivery has started'
            });
        }

        // Find the requested hub
        const { HUBS } = require('../utils/hubSelection.js');
        const newHub = HUBS.find(h => h.id === hubId);

        if (!newHub) {
            return res.status(404).json({ message: 'Hub not found' });
        }

        // Update hub
        order.assignedHub = newHub;
        await order.save();

        res.json({
            message: 'Hub changed successfully',
            assignedHub: order.assignedHub
        });
    } catch (error) {
        console.error('Change hub error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== CANCELLATION REQUEST ====================

// Partner raises cancellation request for fake/problematic orders
router.post('/delivery/raise-cancellation', authenticatePartnerToken, async (req, res) => {
    try {
        const { deliveryId, orderId, partnerId, partnerName, reason } = req.body;

        console.log('🚨 Cancellation request from partner:', { deliveryId, orderId, partnerId, reason });

        // Validate request
        if (!deliveryId || !reason) {
            return res.status(400).json({ message: 'Delivery ID and reason are required' });
        }

        if (reason.trim().length < 10) {
            return res.status(400).json({ message: 'Please provide a detailed reason (at least 10 characters)' });
        }

        // Find the delivery
        const delivery = await Delivery.findById(deliveryId);
        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found' });
        }

        // Verify partner owns this delivery
        if (delivery.deliveryPartner.toString() !== partnerId) {
            return res.status(403).json({ message: 'You are not authorized to cancel this delivery' });
        }

        // Check if already cancelled or delivered
        if (['delivered', 'cancelled'].includes(delivery.status)) {
            return res.status(400).json({ message: 'Cannot request cancellation for completed or already cancelled deliveries' });
        }

        // Create cancellation request
        const CancellationRequest = require('../models/CancellationRequest.js');

        // Check for existing pending request
        const existingRequest = await CancellationRequest.findOne({
            delivery: deliveryId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'A cancellation request is already pending for this delivery' });
        }

        const cancellationRequest = new CancellationRequest({
            delivery: deliveryId,
            order: orderId,
            partner: partnerId,
            partnerName: partnerName,
            reason: reason.trim()
        });

        await cancellationRequest.save();

        // Update delivery status to indicate cancellation requested
        delivery.status = 'cancellation_requested';
        delivery.cancellationReason = reason.trim();
        await delivery.save();

        console.log('✅ Cancellation request created:', cancellationRequest._id);

        res.json({
            message: 'Cancellation request submitted successfully',
            requestId: cancellationRequest._id
        });
    } catch (error) {
        console.error('❌ Cancellation request error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ADMIN CANCELLATION REQUEST MANAGEMENT ====================

// Get all cancellation requests (admin)
router.get('/admin/cancellation-requests', authenticateAdminToken, async (req, res) => {
    try {
        const CancellationRequest = require('../models/CancellationRequest.js');

        const requests = await CancellationRequest.find()
            .populate({
                path: 'order',
                select: '_id totalAmount userId',
                populate: {
                    path: 'userId',
                    select: 'name email phone'
                }
            })
            .populate('delivery', 'status deliveryLocation')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching cancellation requests:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Approve cancellation request (admin)
router.post('/admin/cancellation-requests/approve', authenticateAdminToken, async (req, res) => {
    try {
        const { requestId, adminNotes, payoutAmount } = req.body;
        const CancellationRequest = require('../models/CancellationRequest.js');

        const request = await CancellationRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request has already been processed' });
        }

        // Validate payout amount (0 to 30)
        const payout = Math.max(0, Math.min(30, Number(payoutAmount) || 0));

        // Update request status
        request.status = 'approved';
        request.adminReview = {
            reviewedBy: req.admin.adminId,
            reviewedAt: new Date(),
            adminNotes: adminNotes || '',
            payoutAmount: payout
        };
        await request.save();

        // Cancel the delivery and set earnings
        const delivery = await Delivery.findById(request.delivery);
        if (delivery) {
            delivery.status = 'cancelled';
            delivery.cancelledAt = new Date();
            delivery.cancelledBy = 'admin';
            delivery.earnings = payout; // Set admin-specified payout amount
            delivery.earningsStatus = payout > 0 ? 'pending' : 'paid'; // If 0, mark as paid (nothing to pay)
            await delivery.save();
        }

        // Cancel the order
        const order = await Order.findById(request.order);
        if (order) {
            order.status = 'cancelled';
            order.cancelledAt = new Date();
            order.cancellationReason = `Cancelled by admin due to partner report: ${request.reason}`;
            await order.save();
        }

        console.log('✅ Cancellation request approved:', requestId, 'Payout:', payout);

        res.json({
            success: true,
            message: `Cancellation approved. Partner will receive ₹${payout}.`,
            requestId: request._id,
            payoutAmount: payout
        });
    } catch (error) {
        console.error('Error approving cancellation request:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Reject cancellation request (admin)
router.post('/admin/cancellation-requests/reject', authenticateAdminToken, async (req, res) => {
    try {
        const { requestId, adminNotes } = req.body;
        const CancellationRequest = require('../models/CancellationRequest.js');

        const request = await CancellationRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request has already been processed' });
        }

        // Update request status
        request.status = 'rejected';
        request.adminReview = {
            reviewedBy: req.admin.adminId,
            reviewedAt: new Date(),
            adminNotes: adminNotes || ''
        };
        await request.save();

        // Restore delivery status to in_transit
        const delivery = await Delivery.findById(request.delivery);
        if (delivery) {
            delivery.status = 'in_transit';
            delivery.cancellationReason = undefined;
            await delivery.save();
        }

        console.log('❌ Cancellation request rejected:', requestId);

        res.json({
            success: true,
            message: 'Cancellation request rejected. Partner must complete delivery.',
            requestId: request._id
        });
    } catch (error) {
        console.error('Error rejecting cancellation request:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;

