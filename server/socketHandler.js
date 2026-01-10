const jwt = require('jsonwebtoken');

// Store connected users: userId -> socketId
const connectedUsers = new Map();

let io = null;

// Initialize socket handler with the Socket.io instance
const initSocketHandler = (socketIo) => {
    io = socketIo;

    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id);

        // Authenticate user or admin on connection
        socket.on('authenticate', (token) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId;
                const adminId = decoded.adminId;

                if (adminId) {
                    // Admin authentication
                    socket.adminId = adminId;
                    socket.join('all_admins');
                    console.log(`Admin ${adminId} connected with socket ${socket.id}`);
                    socket.emit('authenticated', { success: true, adminId });
                } else if (userId) {
                    // User authentication
                    connectedUsers.set(userId, socket.id);
                    socket.userId = userId;
                    console.log(`User ${userId} connected with socket ${socket.id}`);

                    // Join rooms for targeted and broadcast messages
                    socket.join(`user_${userId}`);
                    socket.join('all_users'); // Room for all authenticated users

                    socket.emit('authenticated', { success: true, userId });
                }
            } catch (error) {
                console.log('Socket authentication failed:', error.message);
                socket.emit('authenticated', { success: false, error: 'Invalid token' });
            }
        });

        // Authenticate delivery partner
        socket.on('authenticate-delivery-partner', async (data) => {
            try {
                const { partnerId } = data;

                if (partnerId) {
                    // Store delivery partner socket
                    connectedUsers.set(`partner_${partnerId}`, socket.id);
                    socket.partnerId = partnerId;
                    socket.join(`partner_${partnerId}`);
                    socket.join('all_partners');

                    // Update partner's socketId in database
                    const DeliveryPartner = require('./models/DeliveryPartner.js');
                    await DeliveryPartner.findByIdAndUpdate(partnerId, { socketId: socket.id });

                    console.log(`Delivery Partner ${partnerId} connected with socket ${socket.id}`);
                    socket.emit('authenticated', { success: true, partnerId });
                }
            } catch (error) {
                console.log('Delivery partner authentication failed:', error.message);
                socket.emit('authenticated', { success: false, error: error.message });
            }
        });

        // Update delivery partner location
        socket.on('update-location', async (data) => {
            try {
                const { partnerId, location } = data;

                if (!partnerId || !location || !location.lat || !location.lng) {
                    return socket.emit('error', { message: 'Invalid location data' });
                }

                const DeliveryPartner = require('./models/DeliveryPartner.js');
                await DeliveryPartner.findByIdAndUpdate(partnerId, {
                    location: {
                        type: 'Point',
                        coordinates: [location.lng, location.lat]
                    },
                    currentLocation: {
                        lat: location.lat,
                        lng: location.lng,
                        timestamp: new Date()
                    }
                });

                // Broadcast location to admin and customers tracking this partner
                io.to('all_admins').emit('partner-location-update', {
                    partnerId,
                    location
                });

                console.log(`Location updated for partner ${partnerId}`);
            } catch (error) {
                console.error('Location update error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                console.log(`User ${socket.userId} disconnected`);
            }
            if (socket.partnerId) {
                connectedUsers.delete(`partner_${socket.partnerId}`);
                console.log(`Delivery Partner ${socket.partnerId} disconnected`);
            }
        });
    });
};

// Send mail notification to a specific user
const sendMailNotification = (userId, mailData) => {
    if (!io) {
        console.log('Socket.io not initialized');
        return false;
    }

    const userIdStr = userId.toString();

    // Emit to the user's room
    io.to(`user_${userIdStr}`).emit('new_mail', {
        mail: mailData,
        timestamp: new Date().toISOString()
    });

    console.log(`Mail notification sent to user ${userIdStr}`);
    return true;
};

// Send payment request notification
const sendPaymentRequestNotification = (userId, requestData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('payment_request', {
        request: requestData,
        timestamp: new Date().toISOString()
    });

    console.log(`Payment request notification sent to user ${userIdStr}`);
    return true;
};

// ==================== BROADCAST FUNCTIONS FOR ADMIN UPDATES ====================

// Broadcast category update to all users
const broadcastCategoryUpdate = (action, categoryData) => {
    if (!io) return false;

    io.to('all_users').emit('category_updated', {
        action, // 'created', 'updated', 'deleted', 'toggled'
        category: categoryData,
        timestamp: new Date().toISOString()
    });

    console.log(`Category ${action} broadcast sent`);
    return true;
};

// Broadcast product update to all users
const broadcastProductUpdate = (action, productData) => {
    if (!io) return false;

    io.to('all_users').emit('product_updated', {
        action, // 'created', 'updated', 'deleted'
        product: productData,
        timestamp: new Date().toISOString()
    });

    console.log(`Product ${action} broadcast sent`);
    return true;
};

// Broadcast order update to specific user
const broadcastOrderUpdate = (userId, action, orderData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('order_updated', {
        action, // 'status_changed', 'route_set', etc.
        order: orderData,
        timestamp: new Date().toISOString()
    });

    console.log(`Order ${action} notification sent to user ${userIdStr}`);
    return true;
};

// Broadcast membership update to specific user
const broadcastMembershipUpdate = (userId, badgeData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('membership_updated', {
        badge: badgeData,
        timestamp: new Date().toISOString()
    });

    console.log(`Membership update sent to user ${userIdStr}`);
    return true;
};

// Broadcast wallet update to specific user
const broadcastWalletUpdate = (userId, action, walletData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('wallet_updated', {
        action, // 'deposit', 'withdraw', 'payment'
        ...walletData,
        timestamp: new Date().toISOString()
    });

    console.log(`Wallet ${action} notification sent to user ${userIdStr}`);
    return true;
};

// Get connected user count
const getConnectedUsersCount = () => {
    return connectedUsers.size;
};

// Check if a user is online
const isUserOnline = (userId) => {
    return connectedUsers.has(userId.toString());
};

// ==================== DELIVERY TRACKING FUNCTIONS ====================

// Send delivery assignment to partner
const sendDeliveryAssignment = (partnerId, deliveryData) => {
    if (!io) return false;

    const partnerIdStr = partnerId.toString();

    io.to(`partner_${partnerIdStr}`).emit('delivery-assigned', {
        delivery: deliveryData,
        timestamp: new Date().toISOString()
    });

    console.log(`Delivery assigned to partner ${partnerIdStr}`);
    return true;
};

// Broadcast delivery status update to customer
const broadcastDeliveryStatus = (userId, deliveryData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('delivery-status-update', {
        delivery: deliveryData,
        timestamp: new Date().toISOString()
    });

    console.log(`Delivery status update sent to user ${userIdStr}`);
    return true;
};

// Broadcast partner location to customer tracking the delivery
const broadcastPartnerLocation = (userId, locationData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('partner-location', {
        ...locationData,
        timestamp: new Date().toISOString()
    });

    return true;
};

// Notify customer that delivery is completed
const sendDeliveryCompleted = (userId, deliveryData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('delivery-completed', {
        delivery: deliveryData,
        timestamp: new Date().toISOString()
    });

    console.log(`Delivery completed notification sent to user ${userIdStr}`);
    return true;
};

// ==================== SUPPORT CHAT FUNCTIONS ====================

// Broadcast new support request to all admins
const broadcastSupportRequest = (requestData) => {
    if (!io) return false;

    io.to('all_admins').emit('support_new_request', {
        request: requestData,
        timestamp: new Date().toISOString()
    });

    console.log(`Support request broadcast to all admins`);
    return true;
};

// Notify user that their support request was accepted
const broadcastSupportAccepted = (userId, chatData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('support_accepted', {
        chat: chatData,
        timestamp: new Date().toISOString()
    });

    console.log(`Support accepted notification sent to user ${userIdStr}`);
    return true;
};

// Broadcast new message to both user and admin in the chat
const broadcastSupportMessage = (userId, adminId, messageData) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    // Send to user
    io.to(`user_${userIdStr}`).emit('support_new_message', {
        message: messageData,
        timestamp: new Date().toISOString()
    });

    // Send to admin too (they might be listening on admin room)
    io.to('all_admins').emit('support_new_message', {
        message: messageData,
        userId: userIdStr,
        timestamp: new Date().toISOString()
    });

    console.log(`Support message broadcast for user ${userIdStr}`);
    return true;
};

// Broadcast chat closed notification
const broadcastSupportClosed = (userId, closedBy) => {
    if (!io) return false;

    const userIdStr = userId.toString();

    io.to(`user_${userIdStr}`).emit('support_closed', {
        closedBy,
        timestamp: new Date().toISOString()
    });

    io.to('all_admins').emit('support_closed', {
        userId: userIdStr,
        closedBy,
        timestamp: new Date().toISOString()
    });

    console.log(`Support closed notification sent`);
    return true;
};

// Broadcast new order to all admins for real-time updates
const broadcastNewOrder = (orderData) => {
    if (!io) return false;

    io.to('all_admins').emit('new_order', {
        order: orderData,
        timestamp: new Date().toISOString()
    });

    console.log(`📦 New order broadcast to all admins: #${orderData._id?.toString().slice(-6)}`);
    return true;
};

// Broadcast order status change to all admins for real-time updates
const broadcastOrderStatusChange = (orderId, newStatus, extraData = {}) => {
    if (!io) return false;

    io.to('all_admins').emit('order_status_changed', {
        orderId: orderId,
        status: newStatus,
        ...extraData,
        timestamp: new Date().toISOString()
    });

    console.log(`📝 Order status change broadcast: #${orderId?.toString().slice(-6)} -> ${newStatus}`);
    return true;
};

module.exports = {
    initSocketHandler,
    sendMailNotification,
    sendPaymentRequestNotification,
    broadcastCategoryUpdate,
    broadcastProductUpdate,
    broadcastOrderUpdate,
    broadcastMembershipUpdate,
    broadcastWalletUpdate,
    getConnectedUsersCount,
    isUserOnline,
    // Delivery functions
    sendDeliveryAssignment,
    broadcastDeliveryStatus,
    broadcastPartnerLocation,
    sendDeliveryCompleted,
    // Support chat functions
    broadcastSupportRequest,
    broadcastSupportAccepted,
    broadcastSupportMessage,
    broadcastSupportClosed,
    // Order functions
    broadcastNewOrder,
    broadcastOrderStatusChange
};
