import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import DeliveryTrackingMap from '../../components/admin/DeliveryTrackingMap';
import { Package, MapPin, RefreshCw, Truck, Clock, CheckCircle, XCircle, AlertCircle, Users, Map } from 'lucide-react';
import './OrdersMap.css';

const OrdersMap = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [partners, setPartners] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showTrackingMap, setShowTrackingMap] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchPartners();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`/admin/orders?t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const ordersData = response.data.orders || response.data || [];
            setOrders(ordersData);
            setFilteredOrders(ordersData);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPartners = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/delivery-partners', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPartners(response.data);
        } catch (error) {
            console.error('Error fetching partners:', error);
        }
    };

    const handleMigrateCoordinates = async () => {
        if (!window.confirm('Add sample coordinates to orders without location data?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.post('/admin/migrate-order-coordinates', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire('Success', `Updated ${response.data.ordersUpdated} orders with sample locations`, 'success');
            fetchOrders();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Migration failed', 'error');
        }
    };

    const handleAssignDelivery = async (partnerId) => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.post('/admin/delivery/assign', {
                orderId: selectedOrder._id,
                partnerId: partnerId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await Swal.fire({
                icon: 'success',
                title: 'Delivery Assigned!',
                html: `
                    <p>Partner assigned successfully!</p>
                    <div style="background: linear-gradient(135deg, #667eea20, #764ba220); padding: 20px; border-radius: 12px; margin-top: 15px;">
                        <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Delivery OTP</div>
                        <div style="font-size: 36px; font-weight: 700; color: #667eea; letter-spacing: 4px;">
                            ${response.data.otp}
                        </div>
                        <div style="font-size: 12px; color: #94a3b8; margin-top: 10px;">Share with customer for verification</div>
                    </div>
                `,
                confirmButtonText: 'Done',
                confirmButtonColor: '#667eea'
            });

            setShowAssignModal(false);
            setSelectedOrder(null);
            fetchOrders();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Failed to assign delivery', 'error');
        }
    };

    useEffect(() => {
        if (selectedStatus === 'all') {
            setFilteredOrders(orders);
        } else {
            setFilteredOrders(orders.filter(order => order.status === selectedStatus));
        }
    }, [selectedStatus, orders]);

    const statusFilters = [
        { value: 'all', label: 'All Orders', icon: Package, color: '#667eea' },
        { value: 'pending', label: 'Pending', icon: Clock, color: '#f59e0b' },
        { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: '#3b82f6' },
        { value: 'preparing', label: 'Preparing', icon: Package, color: '#8b5cf6' },
        { value: 'out-for-delivery', label: 'Out for Delivery', icon: Truck, color: '#f97316' },
        { value: 'delivered', label: 'Delivered', icon: CheckCircle, color: '#22c55e' },
        { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: '#ef4444' }
    ];

    const stats = {
        total: orders.length,
        ...orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {})
    };

    const getStatusColor = (status) => {
        const filter = statusFilters.find(f => f.value === status);
        return filter?.color || '#667eea';
    };

    if (loading) {
        return (
            <div className="om-loading">
                <div className="om-spinner"></div>
                <p>Loading orders...</p>
            </div>
        );
    }

    return (
        <div className="orders-map-page">
            {/* Header */}
            <div className="om-header">
                <div className="om-header-content">
                    <div className="om-header-icon">
                        <MapPin size={28} />
                    </div>
                    <div className="om-header-text">
                        <h1>Orders & Delivery</h1>
                        <p>Manage orders and track deliveries</p>
                    </div>
                </div>
                <div className="om-header-actions">
                    <button onClick={handleMigrateCoordinates} className="om-btn om-btn-secondary">
                        <Map size={18} />
                        Add Sample Locations
                    </button>
                    <button onClick={fetchOrders} className="om-btn om-btn-primary">
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="om-stats">
                {statusFilters.map(filter => {
                    const IconComponent = filter.icon;
                    const count = filter.value === 'all' ? stats.total : stats[filter.value] || 0;
                    const isActive = selectedStatus === filter.value;

                    return (
                        <div
                            key={filter.value}
                            className={`om-stat-card ${isActive ? 'active' : ''}`}
                            onClick={() => setSelectedStatus(filter.value)}
                            style={{ '--stat-color': filter.color }}
                        >
                            <div className="om-stat-icon">
                                <IconComponent size={24} />
                            </div>
                            <div className="om-stat-info">
                                <span className="om-stat-count">{count}</span>
                                <span className="om-stat-label">{filter.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Orders List */}
            <div className="om-orders-section">
                <div className="om-section-header">
                    <h2>
                        <Package size={22} />
                        {selectedStatus === 'all' ? 'All Orders' : statusFilters.find(f => f.value === selectedStatus)?.label}
                        <span className="om-count-badge">{filteredOrders.length}</span>
                    </h2>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="om-empty">
                        <Package size={64} />
                        <h3>No Orders Found</h3>
                        <p>No orders match the selected filter</p>
                    </div>
                ) : (
                    <div className="om-orders-list">
                        {filteredOrders.map((order) => (
                            <div key={order._id} className="om-order-card">
                                <div className="om-order-main">
                                    <div className="om-order-info">
                                        <div className="om-order-id">Order #{order._id.slice(-6)}</div>
                                        <div className="om-order-customer">
                                            {order.userId?.name || 'N/A'}
                                        </div>
                                        <div className="om-order-location">
                                            <MapPin size={14} />
                                            {order.shippingAddress?.city || 'Unknown'}
                                        </div>
                                    </div>
                                    <div className="om-order-amount">
                                        ₹{order.totalAmount?.toFixed(2)}
                                    </div>
                                </div>
                                <div className="om-order-actions">
                                    <span
                                        className="om-status-badge"
                                        style={{ background: getStatusColor(order.status) }}
                                    >
                                        {order.status?.replace(/-/g, ' ')}
                                    </span>
                                    <div className="om-action-btns">
                                        {(order.status === 'confirmed' || order.status === 'preparing') && (
                                            <button
                                                className="om-action-btn assign"
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setShowAssignModal(true);
                                                }}
                                            >
                                                <Truck size={16} />
                                                Assign
                                            </button>
                                        )}
                                        <button
                                            className="om-action-btn view"
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowTrackingMap(true);
                                            }}
                                        >
                                            <Map size={16} />
                                            View Map
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assign Delivery Modal */}
            {showAssignModal && selectedOrder && (
                <div className="om-modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="om-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="om-modal-header">
                            <h2><Truck size={24} /> Assign Delivery Partner</h2>
                            <button className="om-modal-close" onClick={() => setShowAssignModal(false)}>×</button>
                        </div>

                        <div className="om-modal-body">
                            <div className="om-order-summary">
                                <div className="om-summary-row">
                                    <span>Order</span>
                                    <strong>#{selectedOrder._id.slice(-6)}</strong>
                                </div>
                                <div className="om-summary-row">
                                    <span>Customer</span>
                                    <strong>{selectedOrder.userId?.name}</strong>
                                </div>
                                <div className="om-summary-row">
                                    <span>Location</span>
                                    <strong>{selectedOrder.shippingAddress?.city}</strong>
                                </div>
                                <div className="om-summary-row">
                                    <span>Amount</span>
                                    <strong className="amount">₹{selectedOrder.totalAmount?.toFixed(2)}</strong>
                                </div>
                            </div>

                            <div className="om-partners-section">
                                <h3><Users size={20} /> Available Partners ({partners.filter(p => p.isApproved).length})</h3>

                                {partners.filter(p => p.isApproved).length === 0 ? (
                                    <div className="om-no-partners">
                                        <AlertCircle size={40} />
                                        <p>No delivery partners available</p>
                                    </div>
                                ) : (
                                    <div className="om-partners-list">
                                        {partners.filter(p => p.isApproved).map(partner => (
                                            <div
                                                key={partner._id}
                                                className="om-partner-card"
                                                onClick={() => handleAssignDelivery(partner._id)}
                                            >
                                                <div className="om-partner-avatar">
                                                    {partner.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="om-partner-info">
                                                    <div className="om-partner-name">{partner.name}</div>
                                                    <div className="om-partner-vehicle">
                                                        {partner.vehicle?.type} • {partner.vehicle?.number}
                                                    </div>
                                                    <div className="om-partner-stats">
                                                        ⭐ {partner.rating?.toFixed(1)} • {partner.totalDeliveries} deliveries
                                                    </div>
                                                </div>
                                                <div className="om-partner-status available">Available</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="om-modal-footer">
                            <button className="om-btn om-btn-cancel" onClick={() => setShowAssignModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delivery Tracking Map Modal */}
            {showTrackingMap && selectedOrder && (
                <DeliveryTrackingMap
                    order={selectedOrder}
                    onClose={() => {
                        setShowTrackingMap(false);
                        setSelectedOrder(null);
                    }}
                />
            )}
        </div>
    );
};

export default OrdersMap;
