import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import {
    Power,
    PowerOff,
    CheckCircle,
    AlertCircle,
    Server,
    Shield,
    Wifi,
    WifiOff,
    Loader2
} from 'lucide-react';
import { renderToString } from 'react-dom/server';
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

        // Custom icon HTML for confirmation dialog
        const confirmIconHtml = isGoingOffline
            ? `<div class="swal-icon-container offline-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="swal-animated-icon">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
               </div>`
            : `<div class="swal-icon-container online-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="swal-animated-icon">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
               </div>`;

        const result = await Swal.fire({
            html: `
                ${confirmIconHtml}
                <h2 class="swal-custom-title">
                    <span class="status-dot ${isGoingOffline ? 'red' : 'green'}"></span>
                    Turn ${isGoingOffline ? 'Off' : 'On'} Server?
                </h2>
                <p class="swal-custom-text">
                    This will ${isGoingOffline ? 'put the website in' : 'bring the website'} <strong>${isGoingOffline ? 'maintenance mode' : 'back online'}</strong>.
                </p>
                <p class="swal-custom-subtext ${isGoingOffline ? 'red' : 'green'}">
                    ${isGoingOffline ? 'Users will see the maintenance page.' : 'Users will be able to access the site again!'}
                </p>
            `,
            showCancelButton: true,
            confirmButtonColor: isGoingOffline ? '#ef4444' : '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: `Yes, Turn ${isGoingOffline ? 'Off' : 'On'}!`,
            cancelButtonText: 'Cancel',
            showClass: {
                popup: 'animate__animated animate__fadeInDown animate__faster',
                backdrop: 'swal-backdrop-show'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutUp animate__faster',
                backdrop: 'swal-backdrop-hide'
            },
            customClass: {
                popup: 'swal-custom-popup',
                confirmButton: 'swal-confirm-btn',
                cancelButton: 'swal-cancel-btn'
            },
            backdrop: `rgba(0,0,0,0.8)`,
            allowOutsideClick: false
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

            // Success popup with animated icon
            const successIconHtml = response.data.maintenanceMode
                ? `<div class="swal-icon-container success-offline">
                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="swal-animated-icon swal-checkmark">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                   </div>`
                : `<div class="swal-icon-container success-online">
                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="swal-animated-icon swal-checkmark">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                   </div>`;

            await Swal.fire({
                html: `
                    ${successIconHtml}
                    <h2 class="swal-custom-title">
                        <span class="status-dot ${response.data.maintenanceMode ? 'red' : 'green'}"></span>
                        Server ${response.data.maintenanceMode ? 'Offline' : 'Online'}!
                    </h2>
                    <p class="swal-custom-text">
                        The website is now <strong>${response.data.maintenanceMode ? 'in maintenance mode' : 'back online'}</strong>!
                    </p>
                    <p class="swal-custom-subtext ${response.data.maintenanceMode ? 'red' : 'green'}">
                        ${response.data.maintenanceMode ? 'Users will see the maintenance page.' : 'Users can access the site normally.'}
                    </p>
                `,
                confirmButtonColor: response.data.maintenanceMode ? '#ef4444' : '#28a745',
                confirmButtonText: 'OK',
                timer: 4000,
                timerProgressBar: true,
                showClass: {
                    popup: 'animate__animated animate__zoomIn animate__faster',
                    backdrop: 'swal-backdrop-show'
                },
                hideClass: {
                    popup: 'animate__animated animate__zoomOut animate__faster',
                    backdrop: 'swal-backdrop-hide'
                },
                customClass: {
                    popup: 'swal-custom-popup',
                    confirmButton: 'swal-confirm-btn'
                },
                backdrop: `rgba(0,0,0,0.8)`
            });
        } catch (error) {
            console.error('Error toggling maintenance mode:', error);

            // Error popup
            await Swal.fire({
                html: `
                    <div class="swal-icon-container error-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="swal-animated-icon swal-shake">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <h2 class="swal-custom-title error">
                        Error Occurred
                    </h2>
                    <p class="swal-custom-text">
                        ${error.response?.data?.message || 'Failed to toggle maintenance mode'}
                    </p>
                `,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'OK',
                showClass: {
                    popup: 'animate__animated animate__shakeX',
                    backdrop: 'swal-backdrop-show'
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOut animate__faster',
                    backdrop: 'swal-backdrop-hide'
                },
                customClass: {
                    popup: 'swal-custom-popup',
                    confirmButton: 'swal-confirm-btn'
                },
                backdrop: `rgba(0,0,0,0.8)`
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
                    <Server size={32} color="#667eea" />
                    Server Management
                </h1>
                <p className="server-subtitle">Control your website's maintenance mode</p>
            </div>

            <div className="server-content">
                <div className={`server-status-card ${serverStatus.maintenanceMode ? 'offline' : 'online'}`}>
                    <div className="status-icon-large">
                        {serverStatus.maintenanceMode ? (
                            <AlertCircle size={80} />
                        ) : (
                            <CheckCircle size={80} />
                        )}
                    </div>

                    <h2 className="status-title">Server Status</h2>

                    <div className={`status-badge-large ${serverStatus.maintenanceMode ? 'offline' : 'online'}`}>
                        <span className="status-dot-large"></span>
                        {serverStatus.maintenanceMode ? 'OFFLINE - MAINTENANCE MODE' : 'ONLINE - RUNNING NORMALLY'}
                    </div>

                    <p className="status-description">
                        {serverStatus.maintenanceMode
                            ? 'The website is currently in maintenance mode. All users are seeing a maintenance message.'
                            : 'The website is running normally. All users can access the site.'}
                    </p>

                    <button
                        className={`toggle-btn-large ${serverStatus.maintenanceMode ? 'turn-on' : 'turn-off'}`}
                        onClick={toggleMaintenanceMode}
                        disabled={togglingServer}
                    >
                        {togglingServer ? (
                            <>
                                <Loader2 size={24} className="spinning" />
                                {serverStatus.maintenanceMode ? 'Turning On...' : 'Turning Off...'}
                            </>
                        ) : serverStatus.maintenanceMode ? (
                            <>
                                <Power size={24} />
                                Turn Server ON
                            </>
                        ) : (
                            <>
                                <PowerOff size={24} />
                                Turn Server OFF
                            </>
                        )}
                    </button>
                </div>

                <div className="server-info-cards">
                    <div className="info-card">
                        <div className="info-icon online-icon">
                            <Wifi size={24} />
                        </div>
                        <h3>Online Mode</h3>
                        <p>When online, all website features are accessible. Users can browse, shop, and place orders.</p>
                    </div>

                    <div className="info-card">
                        <div className="info-icon offline-icon">
                            <WifiOff size={24} />
                        </div>
                        <h3>Maintenance Mode</h3>
                        <p>Users see a maintenance message. Use for updates, fixes, or scheduled downtime.</p>
                    </div>

                    <div className="info-card">
                        <div className="info-icon admin-icon">
                            <Shield size={24} />
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
