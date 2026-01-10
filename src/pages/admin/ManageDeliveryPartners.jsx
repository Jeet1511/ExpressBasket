import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios.js';
import Swal from 'sweetalert2';
import { useTheme } from '../../context/ThemeContext.jsx';
import './ManageDeliveryPartners.css';

const ManageDeliveryPartners = () => {
    const { theme } = useTheme();
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPartner, setNewPartner] = useState({
        name: '',
        phone: '',
        email: '',
        vehicle: {
            type: 'bike',
            number: ''
        }
    });

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/delivery-partners', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPartners(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching partners:', error);
            setLoading(false);
        }
    };

    const handleAddPartner = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post('/admin/delivery-partners', newPartner, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddModal(false);
            setNewPartner({
                name: '',
                phone: '',
                email: '',
                vehicle: { type: 'bike', number: '' }
            });
            fetchPartners();
            Swal.fire('Success', 'Delivery partner added successfully!', 'success');
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Failed to add partner', 'error');
        }
    };

    const toggleAvailability = async (id, currentStatus) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`/admin/delivery-partners/${id}`, {
                isAvailable: !currentStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPartners();
        } catch (error) {
            Swal.fire('Error', 'Failed to update availability', 'error');
        }
    };

    const handleApprove = async (id) => {
        const result = await Swal.fire({
            title: 'Approve Partner?',
            text: 'This partner will be able to log in and accept deliveries',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#22c55e',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, approve!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('adminToken');
                await axios.put(`/admin/delivery-partners/${id}`, {
                    isApproved: true
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Approved!', 'Partner has been approved and can now log in.', 'success');
                fetchPartners();
            } catch (error) {
                Swal.fire('Error', 'Failed to approve partner', 'error');
            }
        }
    };

    const handleReject = async (id) => {
        const result = await Swal.fire({
            title: 'Reject Application?',
            text: 'This will delete the partner application',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, reject it!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('adminToken');
                await axios.delete(`/admin/delivery-partners/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Rejected!', 'Application has been rejected.', 'success');
                fetchPartners();
            } catch (error) {
                Swal.fire('Error', 'Failed to reject application', 'error');
            }
        }
    };

    // Vehicle Icons (SVG)
    const VehicleIcon = ({ type }) => {
        if (type === 'bike') return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18.5" cy="17.5" r="3.5" />
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="15" cy="5" r="1" />
                <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
            </svg>
        );
        if (type === 'scooter') return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5" cy="17" r="3" />
                <circle cx="19" cy="17" r="3" />
                <path d="M8.5 17h7" />
                <path d="M5 9l2 8" />
                <path d="M19 9l-2 8" />
                <path d="M6 9h13l-2-4H7z" />
            </svg>
        );
        if (type === 'car') return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-3-6H9L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
            </svg>
        );
        return (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 17h4V5H2v12h3" />
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
                <path d="M14 17h1" />
                <circle cx="7.5" cy="17.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
        );
    };

    const pendingPartners = partners.filter(p => !p.isApproved);
    const approvedPartners = partners.filter(p => p.isApproved);

    if (loading) {
        return (
            <div className="dp-loading">
                <div className="dp-spinner"></div>
                <p>Loading delivery partners...</p>
            </div>
        );
    }

    return (
        <div className="manage-delivery-partners">
            <div className="dp-header">
                <div className="dp-header-info">
                    <h1>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 17h4V5H2v12h3" />
                            <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
                            <path d="M14 17h1" />
                            <circle cx="7.5" cy="17.5" r="2.5" />
                            <circle cx="17.5" cy="17.5" r="2.5" />
                        </svg>
                        Delivery Partners
                    </h1>
                    <p>Manage your delivery team</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="add-partner-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add New Partner
                </button>
            </div>

            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon approved">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value" style={{ color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>{approvedPartners.length}</span>
                        <span className="stat-label" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>Approved Partners</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon available">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value" style={{ color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>{approvedPartners.filter(p => p.isAvailable).length}</span>
                        <span className="stat-label" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>Available Now</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pending">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value" style={{ color: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}>{pendingPartners.length}</span>
                        <span className="stat-label" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>Pending Approval</span>
                    </div>
                </div>
            </div>

            {/* Pending Approvals Section */}
            {pendingPartners.length > 0 && (
                <div className="pending-section">
                    <h2>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Pending Approvals ({pendingPartners.length})
                    </h2>
                    <div className="partners-grid">
                        {pendingPartners.map(partner => (
                            <div key={partner._id} className="partner-card pending">
                                <div className="partner-header">
                                    <div className="partner-avatar">
                                        {partner.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="partner-info">
                                        <h3>{partner.name}</h3>
                                        <p className="partner-email">{partner.email}</p>
                                    </div>
                                    <span className="status-badge pending">Pending</span>
                                </div>

                                <div className="partner-details">
                                    <div className="detail-row">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                        </svg>
                                        <span>{partner.phone}</span>
                                    </div>
                                    <div className="detail-row">
                                        <VehicleIcon type={partner.vehicle?.type} />
                                        <span>{partner.vehicle?.type} - {partner.vehicle?.number}</span>
                                    </div>
                                </div>

                                <div className="partner-actions">
                                    <button className="approve-btn" onClick={() => handleApprove(partner._id)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Approve
                                    </button>
                                    <button className="reject-btn" onClick={() => handleReject(partner._id)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved Partners Section */}
            <div className="approved-section">
                <h2>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Approved Partners ({approvedPartners.length})
                </h2>
                <div className="partners-grid">
                    {approvedPartners.map(partner => (
                        <div key={partner._id} className="partner-card">
                            <div className="partner-header">
                                <div className="partner-avatar">
                                    {partner.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="partner-info">
                                    <h3>{partner.name}</h3>
                                    <p className="partner-email">{partner.email}</p>
                                </div>
                                <div className={`status-badge ${partner.isAvailable ? 'available' : 'busy'}`}>
                                    {partner.isAvailable ? 'Available' : 'Busy'}
                                </div>
                            </div>

                            <div className="partner-details">
                                <div className="detail-row">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                    <span>{partner.phone}</span>
                                </div>

                                <div className="detail-row">
                                    <VehicleIcon type={partner.vehicle?.type} />
                                    <span style={{ textTransform: 'capitalize' }}>{partner.vehicle?.type} - {partner.vehicle?.number}</span>
                                </div>

                                <div className="detail-row">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                    <span>{partner.rating?.toFixed(1) || '0.0'} ({partner.totalDeliveries || 0} deliveries)</span>
                                </div>

                                {partner.activeOrders?.length > 0 && (
                                    <div className="active-orders">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                        </svg>
                                        <span>{partner.activeOrders.length} Active Orders</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {partners.length === 0 && (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <h3>No Delivery Partners Yet</h3>
                    <p>Add your first delivery partner to start managing deliveries</p>
                </div>
            )}

            {/* Add Partner Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="8.5" cy="7" r="4" />
                                    <line x1="20" y1="8" x2="20" y2="14" />
                                    <line x1="23" y1="11" x2="17" y2="11" />
                                </svg>
                                Add New Delivery Partner
                            </h2>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddPartner}>
                            <div className="form-body">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        value={newPartner.name}
                                        onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                                        required
                                        placeholder="Enter partner name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        value={newPartner.email}
                                        onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                                        required
                                        placeholder="partner@example.com"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input
                                        type="tel"
                                        value={newPartner.phone}
                                        onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                                        required
                                        placeholder="+91 98765 43210"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Password *</label>
                                    <input
                                        type="password"
                                        value={newPartner.password || ''}
                                        onChange={(e) => setNewPartner({ ...newPartner, password: e.target.value })}
                                        required
                                        placeholder="Enter password"
                                        minLength="6"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Vehicle Type *</label>
                                        <select
                                            value={newPartner.vehicle.type}
                                            onChange={(e) => setNewPartner({
                                                ...newPartner,
                                                vehicle: { ...newPartner.vehicle, type: e.target.value }
                                            })}
                                            required
                                        >
                                            <option value="bike">Bike</option>
                                            <option value="scooter">Scooter</option>
                                            <option value="car">Car</option>
                                            <option value="van">Van</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Vehicle Number *</label>
                                        <input
                                            type="text"
                                            value={newPartner.vehicle.number}
                                            onChange={(e) => setNewPartner({
                                                ...newPartner,
                                                vehicle: { ...newPartner.vehicle, number: e.target.value }
                                            })}
                                            required
                                            placeholder="MH12AB1234"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddModal(false)} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Add Partner
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageDeliveryPartners;
