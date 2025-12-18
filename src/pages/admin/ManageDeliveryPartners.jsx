import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios.js';
import './ManageDeliveryPartners.css';

const ManageDeliveryPartners = () => {
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
            alert('Delivery partner added successfully!');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add partner');
        }
    };

    const getVehicleIcon = (type) => {
        const icons = {
            bike: '🏍️',
            scooter: '🛵',
            car: '🚗',
            van: '🚐'
        };
        return icons[type] || '🚚';
    };

    if (loading) {
        return (
            <div className="delivery-partners-container">
                <div className="loading">Loading delivery partners...</div>
            </div>
        );
    }

    return (
        <div className="delivery-partners-container">
            <div className="page-header">
                <h1>Delivery Partners</h1>
                <button onClick={() => setShowAddModal(true)} className="add-partner-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add New Partner
                </button>
            </div>

            <div className="partners-grid">
                {partners.map(partner => (
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
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span>{partner.phone}</span>
                            </div>

                            <div className="detail-row">
                                <span className="vehicle-icon">{getVehicleIcon(partner.vehicle.type)}</span>
                                <span>{partner.vehicle.type} - {partner.vehicle.number}</span>
                            </div>

                            <div className="detail-row">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span>{partner.rating.toFixed(1)} ({partner.totalDeliveries} deliveries)</span>
                            </div>

                            {partner.activeOrders.length > 0 && (
                                <div className="active-orders">
                                    <strong>Active Orders:</strong> {partner.activeOrders.length}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {partners.length === 0 && (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h3>No Delivery Partners Yet</h3>
                    <p>Add your first delivery partner to start managing deliveries</p>
                </div>
            )}

            {/* Add Partner Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Delivery Partner</h2>
                        <form onSubmit={handleAddPartner}>
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

                            <div className="modal-actions">
                                <button type="submit" className="submit-btn">Add Partner</button>
                                <button type="button" onClick={() => setShowAddModal(false)} className="cancel-btn">
                                    Cancel
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
