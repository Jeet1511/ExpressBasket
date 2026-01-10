import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import './PartnerProfile.css';

const PartnerProfile = () => {
    const [partnerInfo, setPartnerInfo] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        vehicleType: 'bike',
        vehicleNumber: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const info = localStorage.getItem('partnerInfo');
        if (info) {
            const parsed = JSON.parse(info);
            setPartnerInfo(parsed);
            setFormData({
                name: parsed.name || '',
                phone: parsed.phone || '',
                vehicleType: parsed.vehicle?.type || 'bike',
                vehicleNumber: parsed.vehicle?.number || ''
            });
        }
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('partnerToken');
            // TODO: Implement update partner API
            await Swal.fire({
                icon: 'success',
                title: 'Profile Updated',
                text: 'Your profile has been updated successfully.',
                confirmButtonColor: '#10b981'
            });

            // Update local storage
            const updatedInfo = {
                ...partnerInfo,
                name: formData.name,
                phone: formData.phone,
                vehicle: {
                    type: formData.vehicleType,
                    number: formData.vehicleNumber
                }
            };
            localStorage.setItem('partnerInfo', JSON.stringify(updatedInfo));
            setPartnerInfo(updatedInfo);
            setIsEditing(false);
        } catch (error) {
            Swal.fire('Error', 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getVehicleIcon = (type) => {
        switch (type) {
            case 'bike':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18.5" cy="17.5" r="3.5" />
                        <circle cx="5.5" cy="17.5" r="3.5" />
                        <circle cx="15" cy="5" r="1" />
                        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
                    </svg>
                );
            case 'scooter':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="17" r="3" />
                        <circle cx="6" cy="17" r="3" />
                        <path d="M9 17h6" />
                        <path d="M6 7h5l2 4h-7" />
                        <path d="M18 14V7h-5" />
                    </svg>
                );
            case 'car':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2" />
                        <circle cx="7.5" cy="17.5" r="2.5" />
                        <circle cx="16.5" cy="17.5" r="2.5" />
                    </svg>
                );
            default:
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 17h4V5H2v12h3" />
                        <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
                        <circle cx="7.5" cy="17.5" r="2.5" />
                        <circle cx="17.5" cy="17.5" r="2.5" />
                    </svg>
                );
        }
    };

    if (!partnerInfo) {
        return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>Loading profile...</span>
            </div>
        );
    }

    return (
        <div className="partner-profile">
            <div className="profile-header">
                <div className="header-content">
                    <h1>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        My Profile
                    </h1>
                    <p>Manage your account settings</p>
                </div>
                {!isEditing ? (
                    <button className="edit-btn" onClick={() => setIsEditing(true)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit Profile
                    </button>
                ) : (
                    <div className="edit-actions">
                        <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                            Cancel
                        </button>
                        <button className="save-btn" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            <div className="profile-content">
                <div className="profile-card main-info">
                    <div className="avatar-section">
                        <div className="avatar-large">
                            {partnerInfo.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="avatar-info">
                            <h2>{partnerInfo.name}</h2>
                            <span className="email">{partnerInfo.email}</span>
                            <span className={`status-badge ${partnerInfo.isApproved ? 'approved' : 'pending'}`}>
                                {partnerInfo.isApproved ? 'Verified Partner' : 'Pending Approval'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="profile-grid">
                    <div className="profile-card">
                        <div className="card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <h3>Personal Information</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Full Name</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="value">{partnerInfo.name}</span>
                                )}
                            </div>
                            <div className="info-row">
                                <span className="label">Email Address</span>
                                <span className="value">{partnerInfo.email}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Phone Number</span>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="value">{partnerInfo.phone}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="profile-card">
                        <div className="card-header">
                            {getVehicleIcon(partnerInfo.vehicle?.type)}
                            <h3>Vehicle Details</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Vehicle Type</span>
                                {isEditing ? (
                                    <select
                                        value={formData.vehicleType}
                                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                        className="edit-input"
                                    >
                                        <option value="bike">Bike</option>
                                        <option value="scooter">Scooter</option>
                                        <option value="car">Car</option>
                                        <option value="van">Van</option>
                                    </select>
                                ) : (
                                    <span className="value capitalize">{partnerInfo.vehicle?.type}</span>
                                )}
                            </div>
                            <div className="info-row">
                                <span className="label">Vehicle Number</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.vehicleNumber}
                                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="value">{partnerInfo.vehicle?.number}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="profile-card">
                        <div className="card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <h3>Performance</h3>
                        </div>
                        <div className="card-content">
                            <div className="stats-row">
                                <div className="stat-item">
                                    <span className="stat-value">{partnerInfo.rating?.toFixed(1) || '5.0'}</span>
                                    <span className="stat-label">Rating</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{partnerInfo.totalDeliveries || 0}</span>
                                    <span className="stat-label">Deliveries</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{partnerInfo.completionRate || 100}%</span>
                                    <span className="stat-label">Completion</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="profile-card">
                        <div className="card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <h3>Account Details</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Member Since</span>
                                <span className="value">
                                    {new Date(partnerInfo.createdAt).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="label">Account Status</span>
                                <span className={`status-pill ${partnerInfo.isApproved ? 'active' : 'pending'}`}>
                                    {partnerInfo.isApproved ? 'Active' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerProfile;
