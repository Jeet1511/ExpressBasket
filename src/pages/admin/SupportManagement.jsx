import React, { useState, useEffect, useRef } from 'react';
import axios from '../../utils/axios';
import { Headphones, MessageCircle, Send, X, Clock, User, CheckCircle, Lock } from 'lucide-react';
import './SupportManagement.css';
import ViewOnlyBanner from '../../components/admin/ViewOnlyBanner';

// Check if admin is viewer (read-only)
const isViewOnly = (admin) => {
    return admin?.role === 'normal_viewer' || admin?.role === 'special_viewer';
};

const SupportManagement = () => {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeChats, setActiveChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const pollingRef = useRef(null);

    // Viewer restriction
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    const viewOnly = isViewOnly(admin);

    // Fetch pending support requests
    const fetchPendingRequests = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/support/requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingRequests(response.data.requests || []);
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        }
    };

    // Fetch admin's active chats
    const fetchActiveChats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/support/active', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveChats(response.data.chats || []);
        } catch (error) {
            console.error('Error fetching active chats:', error);
        }
    };

    // Accept a support request
    const acceptRequest = async (chatId) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/admin/support/accept/${chatId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPendingRequests();
            fetchActiveChats();
            // Open the chat
            openChat({ id: chatId });
        } catch (error) {
            console.error('Error accepting request:', error);
            alert(error.response?.data?.message || 'Failed to accept request');
        }
    };

    // Open chat and fetch messages
    const openChat = async (chat) => {
        setSelectedChat(chat);
        fetchMessages(chat.id);
        // Start polling for new messages
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => fetchMessages(chat.id), 3000);
    };

    // Fetch messages for a chat
    const fetchMessages = async (chatId) => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`/admin/support/chat/${chatId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(response.data.messages || []);
            setSelectedChat(prev => prev ? { ...prev, user: response.data.user, status: response.data.status } : null);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    // Send message
    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat?.id) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/admin/support/chat/${selectedChat.id}/message`,
                { message: newMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewMessage('');
            fetchMessages(selectedChat.id);
        } catch (error) {
            console.error('Error sending message:', error);
            alert(error.response?.data?.message || 'Failed to send message');
        }
    };

    // Close chat
    const closeChat = async () => {
        if (!selectedChat?.id) return;
        if (!confirm('Are you sure you want to close this chat?')) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`/admin/support/chat/${selectedChat.id}/close`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (pollingRef.current) clearInterval(pollingRef.current);
            setSelectedChat(null);
            setMessages([]);
            fetchActiveChats();
        } catch (error) {
            console.error('Error closing chat:', error);
            alert(error.response?.data?.message || 'Failed to close chat');
        }
    };

    // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initial fetch
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchPendingRequests(), fetchActiveChats()]);
            setLoading(false);
        };
        loadData();

        // Poll for new requests every 10 seconds
        const requestsPolling = setInterval(fetchPendingRequests, 10000);

        return () => {
            clearInterval(requestsPolling);
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    if (loading) {
        return (
            <div className="support-management-loading">
                <Headphones size={48} />
                <p>Loading support requests...</p>
            </div>
        );
    }

    return (
        <div className="support-management">
            <div className="support-header">
                <h1><Headphones size={28} /> Support Center</h1>
                <div className="support-stats">
                    <div className="stat-badge pending">
                        <Clock size={16} />
                        <span>{pendingRequests.length} Pending</span>
                    </div>
                    <div className="stat-badge active">
                        <MessageCircle size={16} />
                        <span>{activeChats.length} Active</span>
                    </div>
                </div>
            </div>

            {viewOnly && <ViewOnlyBanner role={admin?.role} />}

            <div className="support-content">
                {/* Left Panel - Requests & Active Chats */}
                <div className="support-sidebar">
                    {/* Pending Requests */}
                    <div className="support-section">
                        <h3><Clock size={18} /> Pending Requests</h3>
                        {pendingRequests.length === 0 ? (
                            <div className="empty-state">
                                <p>No pending requests</p>
                            </div>
                        ) : (
                            <div className="requests-list">
                                {pendingRequests.map(req => (
                                    <div key={req.id} className="request-card">
                                        <div className="request-info">
                                            <div className="user-avatar">
                                                <User size={20} />
                                            </div>
                                            <div className="user-details">
                                                <span className="user-name">{req.user?.name || 'User'}</span>
                                                <span className="user-email">{req.user?.email}</span>
                                                <span className="request-time">
                                                    {new Date(req.createdAt).toLocaleString('en-IN', {
                                                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="first-message">{req.firstMessage}</p>
                                        {!viewOnly ? (
                                            <button className="accept-btn" onClick={() => acceptRequest(req.id)}>
                                                <CheckCircle size={16} /> Accept
                                            </button>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Lock size={12} /> View Only
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Chats */}
                    <div className="support-section">
                        <h3><MessageCircle size={18} /> Your Active Chats</h3>
                        {activeChats.length === 0 ? (
                            <div className="empty-state">
                                <p>No active chats</p>
                            </div>
                        ) : (
                            <div className="chats-list">
                                {activeChats.map(chat => (
                                    <div
                                        key={chat.id}
                                        className={`chat-card ${selectedChat?.id === chat.id ? 'selected' : ''}`}
                                        onClick={() => openChat(chat)}
                                    >
                                        <div className="user-avatar">
                                            <User size={20} />
                                        </div>
                                        <div className="chat-info">
                                            <span className="user-name">{chat.user?.name || 'User'}</span>
                                            <span className="last-message">
                                                {chat.lastMessage?.message?.slice(0, 40)}...
                                            </span>
                                        </div>
                                        <span className="message-count">{chat.messagesCount}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Chat Window */}
                <div className="chat-panel">
                    {!selectedChat ? (
                        <div className="no-chat-selected">
                            <Headphones size={64} />
                            <h2>Select a chat to start</h2>
                            <p>Accept pending requests or click on active chats to continue conversations</p>
                        </div>
                    ) : (
                        <>
                            <div className="chat-header">
                                <div className="chat-user-info">
                                    <div className="user-avatar large">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3>{selectedChat.user?.name || 'User'}</h3>
                                        <span className="user-email">{selectedChat.user?.email}</span>
                                    </div>
                                </div>
                                <button className="close-chat-btn" onClick={closeChat}>
                                    <X size={18} /> Close Chat
                                </button>
                            </div>

                            <div className="chat-messages">
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`message ${msg.sender === 'Admin' ? 'admin' : 'user'}`}
                                    >
                                        <div className="message-content">{msg.message}</div>
                                        <div className="message-time">
                                            {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {selectedChat.status === 'active' && (
                                <div className="chat-input-container">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && !viewOnly && sendMessage()}
                                        placeholder={viewOnly ? "Viewers cannot send messages" : "Type your message..."}
                                        className="chat-input"
                                        disabled={viewOnly}
                                        style={viewOnly ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                    />
                                    {!viewOnly ? (
                                        <button className="send-btn" onClick={sendMessage}>
                                            <Send size={20} />
                                        </button>
                                    ) : (
                                        <span style={{ padding: '10px 15px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Lock size={16} /> View Only
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportManagement;
