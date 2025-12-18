import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useUser } from './UserContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user, refreshUser } = useUser();
    const [isConnected, setIsConnected] = useState(false);
    const [newMailNotification, setNewMailNotification] = useState(null);

    // Admin update notifications
    const [categoryUpdate, setCategoryUpdate] = useState(null);
    const [productUpdate, setProductUpdate] = useState(null);
    const [orderUpdate, setOrderUpdate] = useState(null);
    const [membershipUpdate, setMembershipUpdate] = useState(null);
    const [walletUpdate, setWalletUpdate] = useState(null);

    const socketRef = useRef(null);

    useEffect(() => {
        // Only connect when user is logged in
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        const token = localStorage.getItem('userToken');
        if (!token) return;

        // Determine socket URL based on environment
        const socketUrl = import.meta.env.VITE_API_URL
            ? import.meta.env.VITE_API_URL.replace('/api', '')
            : 'http://localhost:5000';

        // Create socket connection
        const socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            // Authenticate with user token
            socket.emit('authenticate', token);
        });

        socket.on('authenticated', (data) => {
            if (data.success) {
                console.log('Socket authenticated for user:', data.userId);
                setIsConnected(true);
            } else {
                console.log('Socket authentication failed:', data.error);
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        // ==================== MAIL NOTIFICATIONS ====================
        socket.on('new_mail', (data) => {
            console.log('New mail received:', data);
            setNewMailNotification(data);
        });

        socket.on('payment_request', (data) => {
            console.log('Payment request received:', data);
            setNewMailNotification({
                mail: {
                    subject: 'Payment Request',
                    message: 'You have a new payment request',
                    type: 'payment_request'
                },
                ...data
            });
        });

        // ==================== ADMIN BROADCAST EVENTS ====================

        // Category updates (affects Store, Categories pages)
        socket.on('category_updated', (data) => {
            console.log('Category updated:', data);
            setCategoryUpdate(data);
        });

        // Product updates (affects Store, Home, Cart)
        socket.on('product_updated', (data) => {
            console.log('Product updated:', data);
            setProductUpdate(data);
        });

        // Order updates (affects Profile order history)
        socket.on('order_updated', (data) => {
            console.log('Order updated:', data);
            setOrderUpdate(data);
        });

        // Membership updates (affects Profile badge display)
        socket.on('membership_updated', (data) => {
            console.log('Membership updated:', data);
            setMembershipUpdate(data);
            // Also refresh user data to update badge
            if (refreshUser) refreshUser();
        });

        // Wallet updates (affects Profile wallet balance)
        socket.on('wallet_updated', (data) => {
            console.log('Wallet updated:', data);
            setWalletUpdate(data);
        });

        // Cleanup on unmount
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [user, refreshUser]);

    // Clear notification functions
    const clearNotification = useCallback(() => {
        setNewMailNotification(null);
    }, []);

    const clearCategoryUpdate = useCallback(() => {
        setCategoryUpdate(null);
    }, []);

    const clearProductUpdate = useCallback(() => {
        setProductUpdate(null);
    }, []);

    const clearOrderUpdate = useCallback(() => {
        setOrderUpdate(null);
    }, []);

    const clearMembershipUpdate = useCallback(() => {
        setMembershipUpdate(null);
    }, []);

    const clearWalletUpdate = useCallback(() => {
        setWalletUpdate(null);
    }, []);

    const value = {
        socket: socketRef.current,
        isConnected,
        // Mail notifications
        newMailNotification,
        clearNotification,
        // Admin update events
        categoryUpdate,
        clearCategoryUpdate,
        productUpdate,
        clearProductUpdate,
        orderUpdate,
        clearOrderUpdate,
        membershipUpdate,
        clearMembershipUpdate,
        walletUpdate,
        clearWalletUpdate
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
