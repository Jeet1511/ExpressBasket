import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import './PartnerDashboard.css';

const PartnerDashboard = () => {
    const [stats, setStats] = useState({
        todayDeliveries: 0,
        totalDeliveries: 0,
        earnings: 0,
        rating: 5.0
    });
    const [partnerInfo, setPartnerInfo] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [pendingDeliveries, setPendingDeliveries] = useState([]);
    const [processingDelivery, setProcessingDelivery] = useState(null);

    useEffect(() => {
        // First load from localStorage for quick display
        const info = localStorage.getItem('partnerInfo');
        if (info) {
            const parsedInfo = JSON.parse(info);
            setPartnerInfo(parsedInfo);
            setIsOnline(parsedInfo.isAvailable || false);
        }
        // Then fetch fresh data from server
        fetchPartnerProfile();
        fetchStats();
        fetchPendingDeliveries();

        // Listen for custom event from sidebar toggle
        const handleStatusChange = (event) => {
            setIsOnline(event.detail.isAvailable);
        };
        window.addEventListener('partnerStatusChanged', handleStatusChange);
        return () => window.removeEventListener('partnerStatusChanged', handleStatusChange);
    }, []);

    const fetchPartnerProfile = async () => {
        try {
            const token = localStorage.getItem('partnerToken');
            if (!token) return;

            const response = await axios.get('/partner/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const profile = response.data;
            setPartnerInfo(profile);
            setIsOnline(profile.isAvailable || false);
            // Update localStorage with fresh data
            localStorage.setItem('partnerInfo', JSON.stringify(profile));
        } catch (error) {
            console.error('Error fetching partner profile:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('partnerToken');
            const info = JSON.parse(localStorage.getItem('partnerInfo'));

            // Fetch real earnings and delivery data
            let todayEarnings = 0;
            let todayDeliveries = 0;

            try {
                const earningsResponse = await axios.get('/delivery/partner/earnings', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                todayEarnings = earningsResponse.data.todayEarnings || 0;

                // Also get deliveries to count today's completed
                const deliveriesResponse = await axios.get('/delivery/partner/deliveries', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                todayDeliveries = (deliveriesResponse.data || []).filter(d => {
                    const deliveredDate = new Date(d.deliveredAt || d.updatedAt);
                    return d.status === 'delivered' && deliveredDate >= today;
                }).length;
            } catch (e) {
                console.log('Error fetching earnings/deliveries for stats:', e);
            }

            setStats({
                todayDeliveries,
                totalDeliveries: info?.totalDeliveries || 0,
                earnings: todayEarnings,
                rating: info?.rating || 5.0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchPendingDeliveries = async () => {
        try {
            const token = localStorage.getItem('partnerToken');
            const response = await axios.get('/partner/deliveries', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter for pending acceptance deliveries
            const pending = response.data.filter(d => d.status === 'pending_acceptance');
            setPendingDeliveries(pending);
        } catch (error) {
            console.error('Error fetching deliveries:', error);
        }
    };

    const toggleOnlineStatus = async () => {
        setTogglingStatus(true);
        const newStatus = !isOnline;
        console.log('Toggling status to:', newStatus);

        try {
            const token = localStorage.getItem('partnerToken');
            if (!token) {
                alert('Session expired. Please login again.');
                window.location.href = '/partner/login';
                return;
            }

            console.log('Making API call to toggle-online...');
            const response = await axios.put('/partner/toggle-online',
                { isOnline: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('API Response:', response.data);

            // Update state with server response
            const serverStatus = response.data.isAvailable;
            setIsOnline(serverStatus);

            // Update local storage with the partner data from response
            if (response.data.partner) {
                localStorage.setItem('partnerInfo', JSON.stringify(response.data.partner));
                setPartnerInfo(response.data.partner);
            } else {
                // Fallback: update just isAvailable
                const info = JSON.parse(localStorage.getItem('partnerInfo') || '{}');
                info.isAvailable = serverStatus;
                localStorage.setItem('partnerInfo', JSON.stringify(info));
                setPartnerInfo(info);
            }

            // Dispatch custom event to sync sidebar toggle in real-time
            window.dispatchEvent(new CustomEvent('partnerStatusChanged', {
                detail: { isAvailable: serverStatus }
            }));

            console.log('Status updated successfully to:', serverStatus);
        } catch (error) {
            console.error('Error toggling status:', error.response?.data || error.message);
            alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
        } finally {
            setTogglingStatus(false);
        }
    };

    const handleAcceptDelivery = async (deliveryId) => {
        setProcessingDelivery(deliveryId);
        try {
            const token = localStorage.getItem('partnerToken');
            await axios.post('/delivery/accept',
                { deliveryId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Delivery accepted! Timer has started.');
            fetchPendingDeliveries();
            // Redirect to deliveries page
            window.location.href = '/partner/deliveries';
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to accept delivery');
        } finally {
            setProcessingDelivery(null);
        }
    };

    const handleRejectDelivery = async (deliveryId) => {
        const reason = prompt('Please provide a reason for rejecting (optional):');
        setProcessingDelivery(deliveryId);
        try {
            const token = localStorage.getItem('partnerToken');
            await axios.post('/delivery/reject',
                { deliveryId, reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Delivery rejected. Order returned to admin for reassignment.');
            fetchPendingDeliveries();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to reject delivery');
        } finally {
            setProcessingDelivery(null);
        }
    };

    return (
        <div className="partner-dashboard">
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Welcome back, {partnerInfo?.name}!</h1>
                    <p>Here's your delivery overview for today</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Online/Offline Toggle */}
                    <div className="dashboard-status-toggle">
                        <div className="status-info">
                            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                            <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                        <button
                            className={`modern-toggle ${isOnline ? 'active' : ''}`}
                            onClick={toggleOnlineStatus}
                            disabled={togglingStatus}
                            aria-label="Toggle online status"
                        >
                            <span className="toggle-slider"></span>
                        </button>
                    </div>
                    <div className="header-date">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>
            </div>

            {/* Pending Deliveries Section */}
            {pendingDeliveries.length > 0 && (
                <div className="pending-deliveries-section">
                    <h2 className="section-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                        </svg>
                        Pending Deliveries ({pendingDeliveries.length})
                    </h2>
                    {pendingDeliveries.map(delivery => (
                        <div key={delivery._id} className="pending-delivery-card">
                            <div className="delivery-card-content">
                                <div className="delivery-info">
                                    <p className="order-id">
                                        Order #{delivery.order?._id?.slice(-8)}
                                    </p>
                                    <p className="delivery-address">
                                        {delivery.deliveryLocation?.address || 'Address not available'}
                                    </p>
                                    <p className="customer-name">
                                        Customer: {delivery.order?.userId?.name || 'Unknown'}
                                    </p>
                                </div>
                                <div className="delivery-actions">
                                    <button
                                        onClick={() => handleAcceptDelivery(delivery._id)}
                                        disabled={processingDelivery === delivery._id}
                                        className="accept-btn"
                                    >
                                        {processingDelivery === delivery._id ? 'Processing...' : 'Accept'}
                                    </button>
                                    <button
                                        onClick={() => handleRejectDelivery(delivery._id)}
                                        disabled={processingDelivery === delivery._id}
                                        className="reject-btn"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon orange">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.todayDeliveries}</span>
                        <span className="stat-label">Today's Deliveries</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.totalDeliveries}</span>
                        <span className="stat-label">Total Deliveries</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">₹{stats.earnings}</span>
                        <span className="stat-label">Today's Earnings</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{stats.rating.toFixed(1)}</span>
                        <span className="stat-label">Your Rating</span>
                    </div>
                </div>
            </div>

            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <a href="/partner/deliveries" className="action-card">
                        <div className="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                        <div className="action-content">
                            <h3>View Deliveries</h3>
                            <p>See all assigned orders</p>
                        </div>
                        <div className="action-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </a>

                    <div className="action-card">
                        <div className="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        </div>
                        <div className="action-content">
                            <h3>Update Location</h3>
                            <p>Share your current location</p>
                        </div>
                        <div className="action-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </div>

                    <a href="/partner/profile" className="action-card">
                        <div className="action-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </div>
                        <div className="action-content">
                            <h3>Settings</h3>
                            <p>Manage your profile</p>
                        </div>
                        <div className="action-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </a>
                </div>
            </div>

            <div className="info-section">
                <h2>How It Works</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />
                            </svg>
                        </div>
                        <div className="step-content">
                            <h3>Receive Assignment</h3>
                            <p>Get notified when admin assigns a delivery to you</p>
                        </div>
                    </div>
                    <div className="step-line"></div>
                    <div className="step">
                        <div className="step-number">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            </svg>
                        </div>
                        <div className="step-content">
                            <h3>Pick Up Order</h3>
                            <p>Collect the order from the warehouse</p>
                        </div>
                    </div>
                    <div className="step-line"></div>
                    <div className="step">
                        <div className="step-number">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <div className="step-content">
                            <h3>Deliver & Verify</h3>
                            <p>Deliver to customer and enter OTP to complete</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerDashboard;
