import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from '../../utils/axios';
import { useTheme } from '../../context/ThemeContext';
import './PartnerLayout.css';

const PartnerLayout = ({ children }) => {
    const [partnerInfo, setPartnerInfo] = useState(null);
    const [isAvailable, setIsAvailable] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    // Fetch fresh partner status from server
    const fetchPartnerStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('partnerToken');
            if (!token) return;

            const response = await axios.get('/partner/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const profile = response.data;
            setPartnerInfo(profile);
            setIsAvailable(profile.isAvailable || false);
            localStorage.setItem('partnerInfo', JSON.stringify(profile));
        } catch (error) {
            console.error('Error fetching partner status:', error);
        }
    }, []);

    // Initialize from localStorage only (no auto-refresh that could reset status)
    useEffect(() => {
        const info = localStorage.getItem('partnerInfo');
        if (info) {
            const parsed = JSON.parse(info);
            setPartnerInfo(parsed);
            setIsAvailable(parsed.isAvailable ?? true); // Default to true if undefined
        }

        // Initial fetch to sync with server on page load (once only)
        fetchPartnerStatus();

        // REMOVED: Heartbeat that was auto-refreshing every 2 minutes
        // This was causing status to reset to server state even if user had changed it locally
        // Status should ONLY change when user explicitly toggles it
    }, [fetchPartnerStatus]);

    // Listen for localStorage changes and custom events (from dashboard toggle)
    useEffect(() => {
        const handleStorageChange = () => {
            const info = localStorage.getItem('partnerInfo');
            if (info) {
                const parsed = JSON.parse(info);
                setPartnerInfo(parsed);
                setIsAvailable(parsed.isAvailable);
            }
        };

        // Listen for custom event from dashboard toggle
        const handleStatusChange = (event) => {
            setIsAvailable(event.detail.isAvailable);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('partnerStatusChanged', handleStatusChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('partnerStatusChanged', handleStatusChange);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('partnerToken');
        localStorage.removeItem('partnerInfo');
        navigate('/partner/login');
    };

    const toggleAvailability = async () => {
        const newStatus = !isAvailable;
        // Optimistically update UI
        setIsAvailable(newStatus);

        try {
            const token = localStorage.getItem('partnerToken');
            if (!token) {
                alert('Session expired. Please login again.');
                navigate('/partner/login');
                return;
            }

            const response = await axios.put('/partner/toggle-online',
                { isOnline: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update partnerInfo with new status
            const updatedInfo = { ...partnerInfo, isAvailable: response.data.partner.isAvailable };
            setPartnerInfo(updatedInfo);
            setIsAvailable(response.data.partner.isAvailable);
            localStorage.setItem('partnerInfo', JSON.stringify(updatedInfo));

            // Dispatch custom event to sync dashboard toggle in real-time
            window.dispatchEvent(new CustomEvent('partnerStatusChanged', {
                detail: { isAvailable: response.data.partner.isAvailable }
            }));

            console.log('Partner status toggled:', response.data.partner.isAvailable ? 'Online' : 'Offline');
        } catch (error) {
            // Revert on error
            setIsAvailable(!newStatus);
            console.error('Error toggling status:', error);
            alert('Failed to update status. Please try again.');
        }
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="partner-layout">
            <nav className="partner-nav">
                <div className="partner-nav-header">
                    <div className="partner-brand">
                        <div className="brand-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 17h4V5H2v12h3" />
                                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
                                <path d="M14 17h1" />
                                <circle cx="7.5" cy="17.5" r="2.5" />
                                <circle cx="17.5" cy="17.5" r="2.5" />
                            </svg>
                        </div>
                        <span className="brand-text">Express Partner</span>
                    </div>
                    <button className="partner-theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                        {theme === 'dark' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                </div>

                <div className="partner-status-section">
                    <div className="status-toggle-container">
                        <div className="status-info">
                            <span className={`status-dot ${isAvailable ? 'online' : 'offline'}`}></span>
                            <span className="status-text">{isAvailable ? 'Online' : 'Offline'}</span>
                        </div>
                        <button
                            className={`modern-toggle ${isAvailable ? 'active' : ''}`}
                            onClick={toggleAvailability}
                            aria-label="Toggle availability"
                        >
                            <span className="toggle-slider"></span>
                        </button>
                    </div>
                </div>

                <div className="partner-nav-links">
                    <Link
                        to="/partner/dashboard"
                        className={`nav-link ${isActive('/partner/dashboard') ? 'active' : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        to="/partner/deliveries"
                        className={`nav-link ${isActive('/partner/deliveries') ? 'active' : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                        <span>My Deliveries</span>
                    </Link>
                    <Link
                        to="/partner/earnings"
                        className={`nav-link ${isActive('/partner/earnings') ? 'active' : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <span>My Earnings</span>
                    </Link>
                    <Link
                        to="/partner/profile"
                        className={`nav-link ${isActive('/partner/profile') ? 'active' : ''}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Profile</span>
                    </Link>
                </div>

                <div className="partner-nav-footer">
                    {partnerInfo && (
                        <div className="partner-info">
                            <div className="partner-avatar">
                                {partnerInfo.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="partner-details">
                                <div className="partner-name">{partnerInfo.name}</div>
                                <div className="partner-vehicle">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18.5" cy="17.5" r="3.5" />
                                        <circle cx="5.5" cy="17.5" r="3.5" />
                                        <circle cx="15" cy="5" r="1" />
                                        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
                                    </svg>
                                    <span>{partnerInfo.vehicle?.type} • {partnerInfo.vehicle?.number}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <button className="logout-btn" onClick={handleLogout}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </nav>

            <main className="partner-content">
                {children}
            </main>
        </div>
    );
};

export default PartnerLayout;
