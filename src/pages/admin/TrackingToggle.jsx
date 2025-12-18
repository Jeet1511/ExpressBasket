import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios.js';
import './TrackingToggle.css';

const TrackingToggle = () => {
    const [trackingEnabled, setTrackingEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTrackingStatus();
    }, []);

    const fetchTrackingStatus = async () => {
        try {
            const response = await axios.get('/settings/tracking');
            setTrackingEnabled(response.data.trackingEnabled);
        } catch (error) {
            console.error('Error fetching tracking status:', error);
        }
    };

    const handleToggle = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put('/admin/settings/tracking',
                { enabled: !trackingEnabled },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setTrackingEnabled(!trackingEnabled);
            alert(`Tracking ${!trackingEnabled ? 'ENABLED' : 'DISABLED'} successfully!`);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to toggle tracking. Super admin access required.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tracking-toggle-container">
            <div className="tracking-toggle-card">
                <div className="toggle-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <h3>Order Tracking System</h3>
                </div>

                <div className="toggle-status">
                    <p>Current Status:</p>
                    <span className={`status-badge ${trackingEnabled ? 'enabled' : 'disabled'}`}>
                        {trackingEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                </div>

                <p className="toggle-description">
                    When enabled, order tracking features will be visible to both admins and customers.
                    When disabled, all tracking-related buttons and pages will be hidden.
                </p>

                <button
                    className={`toggle-btn ${trackingEnabled ? 'btn-danger' : 'btn-success'}`}
                    onClick={handleToggle}
                    disabled={loading}
                >
                    {loading ? 'Processing...' : trackingEnabled ? 'Disable Tracking' : 'Enable Tracking'}
                </button>

                <div className="toggle-note">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <small>Only super admins can toggle this setting</small>
                </div>
            </div>
        </div>
    );
};

export default TrackingToggle;
