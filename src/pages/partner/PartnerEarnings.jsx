import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import './PartnerEarnings.css';

const PartnerEarnings = () => {
    const [earnings, setEarnings] = useState({
        totalEarnings: 0,
        pendingPayout: 0,
        completedPayouts: 0,
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0
    });
    const [recentDeliveries, setRecentDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('week');

    useEffect(() => {
        fetchEarningsData();
    }, []);

    const fetchEarningsData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('partnerToken');

            // Fetch earnings from dedicated endpoint
            const response = await axios.get('/delivery/partner/earnings', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = response.data;

            setEarnings({
                totalEarnings: data.totalEarnings || 0,
                pendingPayout: data.pendingPayout || 0,
                completedPayouts: data.completedPayouts || 0,
                todayEarnings: data.todayEarnings || 0,
                weekEarnings: data.weekEarnings || 0,
                monthEarnings: data.monthEarnings || 0
            });

            // Set recent deliveries with earnings
            setRecentDeliveries(data.recentDeliveries || []);

        } catch (error) {
            console.error('Error fetching earnings:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="partner-earnings-page">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <span>Loading earnings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="partner-earnings-page">
            {/* Header */}
            <div className="earnings-header">
                <div className="header-content">
                    <h1>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        My Earnings
                    </h1>
                    <p>Track your delivery earnings and payouts</p>
                </div>
                <div className="total-balance">
                    <span className="balance-label">Total Balance</span>
                    <span className="balance-amount">₹{earnings.totalEarnings.toLocaleString()}</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="earnings-stats">
                <div className="stat-card">
                    <div className="stat-icon pending">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">₹{earnings.pendingPayout.toLocaleString()}</span>
                        <span className="stat-label">Pending Payout</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon completed">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">₹{earnings.completedPayouts.toLocaleString()}</span>
                        <span className="stat-label">Completed Payouts</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon today">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">₹{earnings.todayEarnings.toLocaleString()}</span>
                        <span className="stat-label">Today</span>
                    </div>
                </div>
            </div>

            {/* Period Breakdown */}
            <div className="earnings-breakdown">
                <div className="breakdown-header">
                    <h2>Earnings Breakdown</h2>
                    <div className="period-tabs">
                        <button
                            className={`period-tab ${selectedPeriod === 'today' ? 'active' : ''}`}
                            onClick={() => setSelectedPeriod('today')}
                        >
                            Today
                        </button>
                        <button
                            className={`period-tab ${selectedPeriod === 'week' ? 'active' : ''}`}
                            onClick={() => setSelectedPeriod('week')}
                        >
                            This Week
                        </button>
                        <button
                            className={`period-tab ${selectedPeriod === 'month' ? 'active' : ''}`}
                            onClick={() => setSelectedPeriod('month')}
                        >
                            This Month
                        </button>
                    </div>
                </div>

                <div className="breakdown-content">
                    <div className="breakdown-amount">
                        ₹{selectedPeriod === 'today' ? earnings.todayEarnings :
                            selectedPeriod === 'week' ? earnings.weekEarnings :
                                earnings.monthEarnings}
                    </div>
                    <div className="breakdown-deliveries">
                        {Math.round((selectedPeriod === 'today' ? earnings.todayEarnings :
                            selectedPeriod === 'week' ? earnings.weekEarnings :
                                earnings.monthEarnings) / 30)} deliveries completed
                    </div>
                </div>
            </div>

            {/* Recent Deliveries */}
            <div className="recent-earnings">
                <h2>Recent Delivery Earnings</h2>
                {recentDeliveries.length === 0 ? (
                    <div className="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                        <p>No completed deliveries yet</p>
                    </div>
                ) : (
                    <div className="earnings-list">
                        {recentDeliveries.map(delivery => (
                            <div key={delivery._id} className="earnings-item">
                                <div className="delivery-info">
                                    <span className="order-id">
                                        {delivery.status === 'cancelled' ? '🔴 Cancelled' : '✅ Delivered'} #{delivery.orderId?.slice(-6) || delivery._id?.slice(-6)}
                                    </span>
                                    <span className="delivery-date">
                                        {new Date(delivery.deliveredAt || delivery.cancelledAt || delivery.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <div className="earning-amount">+₹{delivery.earnings}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnerEarnings;
