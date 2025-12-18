import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import './ServerManagement.css';

const ServerManagement = () => {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [serverStatus, setServerStatus] = useState({ status: 'online', maintenanceMode: false });
    const [togglingServer, setTogglingServer] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const adminData = localStorage.getItem('admin');
        if (!adminData) {
            navigate('/admin');
            return;
        }

        try {
            const parsed = JSON.parse(adminData);
            if (parsed.role !== 'super_admin') {
                navigate('/admin/dashboard');
                return;
            }
            setAdmin(parsed);
        } catch (err) {
            navigate('/admin');
            return;
        }

        fetchServerStatus();
        setLoading(false);
    }, [navigate]);

    const fetchServerStatus = async () => {
        try {
            const response = await axios.get('/server/status');
            setServerStatus(response.data);
        } catch (error) {
            console.error('Error fetching server status:', error);
        }
    };

    const toggleMaintenanceMode = async () => {
        const isGoingOffline = !serverStatus.maintenanceMode;

        const result = await Swal.fire({
            title: isGoingOffline ? '🔴 Turn Off Server?' : '🟢 Turn On Server?',
            html: isGoingOffline
                ? '<p style="font-size: 16px;">This will put the website in <strong>maintenance mode</strong>.</p><p style="color: #ef4444;">All users will see a maintenance message!</p>'
                : '<p style="font-size: 16px;">This will bring the website <strong>back online</strong>.</p><p style="color: #28a745;">Users will be able to access the site again!</p>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: isGoingOffline ? '#ef4444' : '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: isGoingOffline ? 'Yes, Turn Off!' : 'Yes, Turn On!',
            cancelButtonText: 'Cancel',
            showClass: { popup: 'animate__animated animate__fadeInDown' },
            hideClass: { popup: 'animate__animated animate__fadeOutUp' }
        });

        if (!result.isConfirmed) return;

        setTogglingServer(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.post('/admin/server/maintenance',
                { enabled: isGoingOffline },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setServerStatus({
                status: response.data.status,
                maintenanceMode: response.data.maintenanceMode
            });

            await Swal.fire({
                title: response.data.maintenanceMode ? '🔴 Server Offline!' : '🟢 Server Online!',
                html: response.data.maintenanceMode
                    ? '<p>The website is now in <strong>maintenance mode</strong>.</p><p style="color: #ef4444; font-weight: 600;">Users will see the maintenance page.</p>'
                    : '<p>The website is now <strong>back online</strong>!</p><p style="color: #28a745; font-weight: 600;">Users can access the site normally.</p>',
                icon: 'success',
                confirmButtonColor: response.data.maintenanceMode ? '#ef4444' : '#28a745',
                timer: 3000,
                timerProgressBar: true,
                showClass: { popup: 'animate__animated animate__zoomIn' },
                hideClass: { popup: 'animate__animated animate__zoomOut' }
            });
        } catch (error) {
            console.error('Error toggling maintenance mode:', error);
            await Swal.fire({
                title: 'Error!',
                text: error.response?.data?.message || 'Failed to toggle maintenance mode',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                showClass: { popup: 'animate__animated animate__shakeX' }
            });
        } finally {
            setTogglingServer(false);
        }
    };

    if (loading) {
        return <div className="server-loading">Loading...</div>;
    }

    return (
        <div className="server-management">
            <div className="server-header">
                <h1>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                        <line x1="6" y1="6" x2="6.01" y2="6"></line>
                        <line x1="6" y1="18" x2="6.01" y2="18"></line>
                    </svg>
                    Server Management
                </h1>
                <p className="server-subtitle">Control your website's maintenance mode</p>
            </div>

            <div className="server-content">
                <div className={`server-status-card ${serverStatus.maintenanceMode ? 'offline' : 'online'}`}>
                    <div className="status-icon-large">
                        {serverStatus.maintenanceMode ? (
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        ) : (
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        )}
                    </div>

                    <div className="status-info">
                        <h2>Server Status</h2>
                        <div className={`status-badge-large ${serverStatus.maintenanceMode ? 'offline' : 'online'}`}>
                            <span className="status-dot-large"></span>
                            {serverStatus.maintenanceMode ? 'OFFLINE - Maintenance Mode' : 'ONLINE - Running Normally'}
                        </div>
                        <p className="status-description">
                            {serverStatus.maintenanceMode
                                ? 'The website is currently in maintenance mode. All users are seeing a maintenance message.'
                                : 'The website is running normally. All users can access the site.'}
                        </p>
                    </div>

                    <button
                        className={`toggle-btn-large ${serverStatus.maintenanceMode ? 'turn-on' : 'turn-off'}`}
                        onClick={toggleMaintenanceMode}
                        disabled={togglingServer}
                    >
                        {togglingServer ? (
                            <>
                                <svg className="spinning" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                                </svg>
                                {serverStatus.maintenanceMode ? 'Turning On...' : 'Turning Off...'}
                            </>
                        ) : serverStatus.maintenanceMode ? (
                            <>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                Turn Server ON
                            </>
                        ) : (
                            <>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="6" y="4" width="4" height="16"></rect>
                                    <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                                Turn Server OFF
                            </>
                        )}
                    </button>
                </div>

                <div className="server-info-cards">
                    <div className="info-card">
                        <div className="info-icon online-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <h3>Online Mode</h3>
                        <p>When online, all website features are accessible. Users can browse, shop, and place orders.</p>
                    </div>

                    <div className="info-card">
                        <div className="info-icon offline-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h3>Maintenance Mode</h3>
                        <p>Users see a maintenance message. Use for updates, fixes, or scheduled downtime.</p>
                    </div>

                    <div className="info-card">
                        <div className="info-icon admin-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                        <h3>Admin Access</h3>
                        <p>Admin panel remains accessible during maintenance. Only user-facing pages are affected.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServerManagement;
