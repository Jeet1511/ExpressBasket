const jwt = require('jsonwebtoken');

// Store connected users: userId -> socketId
const connectedUsers = new Map();

let io = null;

// Initialize socket handler with the Socket.io instance
const initSocketHandler = (socketIo) => {
    io = socketIo;

    io.on('connection', (socket) => {
        console.log('New socket connection:', socket.id);

        // Authenticate user on connection
        socket.on('authenticate', (token) => {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId;

                if (userId) {
                    // Store the socket connection
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

        // Handle disconnect
        socket.on('disconnect', () => {
            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                console.log(`User ${socket.userId} disconnected`);
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
    isUserOnline
};
