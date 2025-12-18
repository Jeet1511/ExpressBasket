import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { format } from 'date-fns';
import axios from '../../utils/axios.js';
import 'leaflet/dist/leaflet.css';
import './OrderTracking.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const OrderTracking = () => {
    const { orderId } = useParams();
    const [trackingData, setTrackingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState({
        overall: 0,
        packaging: 0,
        freshness: 0,
        comment: ''
    });
    const [routeWaypoints, setRouteWaypoints] = useState([]);

    useEffect(() => {
        fetchTrackingData();

        // Poll for updates every 10 seconds if order is out for delivery
        const interval = setInterval(() => {
            if (trackingData?.status === 'out_for_delivery') {
                fetchTrackingData();
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [orderId, trackingData?.status]);

    const fetchTrackingData = async () => {
        try {
            const token = localStorage.getItem('userToken');
            const response = await axios.get(`/ user / orders / ${orderId}/track-route`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTrackingData(response.data);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch tracking data');
            setLoading(false);
        }
    };

    const handleRatingSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('userToken');
            await axios.post(`/user/orders/${orderId}/rate`, rating, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowRatingModal(false);
            fetchTrackingData();
            alert('Thank you for your rating!');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit rating');
        }
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: '⏳',
            confirmed: '✅',
            packed: '📦',
            out_for_delivery: '🚚',
            delivered: '🎉',
            cancelled: '❌'
        };
        return icons[status] || '📋';
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: '#ffc107',
            confirmed: '#28a745',
            packed: '#17a2b8',
            out_for_delivery: '#007bff',
            delivered: '#28a745',
            cancelled: '#dc3545'
        };
        return colors[status] || '#6c757d';
    };

    if (loading) {
        return (
            <div className="tracking-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading tracking information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="tracking-container">
                <div className="error-card">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h2>Error Loading Tracking</h2>
                    <p>{error}</p>
                    <Link to="/profile" className="back-btn">Back to Orders</Link>
                </div>
            </div>
        );
    }

    // Check if route not allocated yet
    if (trackingData && !trackingData.packagingPoint) {
        return (
            <div className="tracking-container">
                <div className="error-card" style={{ background: 'var(--card-bg)', border: '2px solid var(--btn-primary)' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <h2 style={{ color: 'var(--text-color)' }}>Route Not Allocated Yet</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Your order is confirmed! Our team is currently preparing the delivery route.
                        Please check back in a few minutes.
                    </p>
                    <Link to="/profile" className="back-btn" style={{ marginTop: '20px' }}>
                        Back to Orders
                    </Link>
                </div>
            </div>
        );
    }

    const { status, statusHistory, deliveryPartner, currentLocation, shippingAddress, estimatedDeliveryTime, eta, distance, items, totalAmount, packagingPoint } = trackingData;

    return (
        <div className="tracking-container">
            <div className="tracking-header">
                <button onClick={() => navigate('/profile')} className="back-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Orders
                </button>
                <h1>Track Your Order</h1>
                <p className="order-id">Order #{orderId.slice(-8).toUpperCase()}</p>
            </div>

            {/* Status Timeline */}
            <div className="status-timeline-card">
                <h2>Order Status</h2>
                <div className="timeline">
                    {['confirmed', 'packed', 'out_for_delivery', 'delivered'].map((step, index) => {
                        const isCompleted = statusHistory?.some(h => h.status === step);
                        const isCurrent = status === step;
                        const stepHistory = statusHistory?.find(h => h.status === step);

                        return (
                            <div key={step} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                                <div className="timeline-marker">
                                    <div className="marker-icon" style={{ background: isCompleted || isCurrent ? getStatusColor(step) : '#e0e0e0' }}>
                                        {isCompleted ? '✓' : getStatusIcon(step)}
                                    </div>
                                    {index < 3 && <div className="timeline-line" style={{ background: isCompleted ? getStatusColor(step) : '#e0e0e0' }}></div>}
                                </div>
                                <div className="timeline-content">
                                    <h3>{step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                                    {stepHistory && (
                                        <>
                                            <p className="timeline-time">{format(new Date(stepHistory.timestamp), 'MMM dd, hh:mm a')}</p>
                                            {stepHistory.message && <p className="timeline-message">{stepHistory.message}</p>}
                                        </>
                                    )}
                                    {isCurrent && !isCompleted && <p className="timeline-message">In Progress...</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Live Map (only show when out for delivery) */}
            {status === 'out_for_delivery' && currentLocation && shippingAddress?.coordinates && (
                <div className="map-card">
                    <div className="map-header">
                        <h2>Live Tracking</h2>
                        {eta && <div className="eta-badge">ETA: {eta}</div>}
                        {distance && <div className="distance-badge">{distance}</div>}
                    </div>
                    <MapContainer
                        center={[currentLocation.lat, currentLocation.lng]}
                        zoom={13}
                        style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />

                        {/* Delivery Partner Marker */}
                        <Marker position={[currentLocation.lat, currentLocation.lng]}>
                            <Popup>
                                <strong>{deliveryPartner?.name}</strong><br />
                                {deliveryPartner?.vehicle}<br />
                                Current Location
                            </Popup>
                        </Marker>

                        {/* Destination Marker */}
                        <Marker position={[shippingAddress.coordinates.lat, shippingAddress.coordinates.lng]}>
                            <Popup>
                                <strong>Delivery Address</strong><br />
                                {shippingAddress.street}, {shippingAddress.city}
                            </Popup>
                        </Marker>

                        {/* Route Line */}
                        <Polyline
                            positions={[
                                [currentLocation.lat, currentLocation.lng],
                                [shippingAddress.coordinates.lat, shippingAddress.coordinates.lng]
                            ]}
                            color="#007bff"
                            weight={3}
                            opacity={0.7}
                            dashArray="10, 10"
                        />
                    </MapContainer>
                </div>
            )}

            {/* Delivery Partner Card */}
            {deliveryPartner && status === 'out_for_delivery' && (
                <div className="delivery-partner-card">
                    <div className="partner-header">
                        <div className="partner-avatar">
                            {deliveryPartner.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="partner-info">
                            <h3>{deliveryPartner.name}</h3>
                            <p className="partner-vehicle">{deliveryPartner.vehicle}</p>
                        </div>
                    </div>
                    <div className="partner-actions">
                        <a href={`tel:${deliveryPartner.phone}`} className="contact-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            Call {deliveryPartner.phone}
                        </a>
                    </div>
                </div>
            )}

            {/* Order Details */}
            <div className="order-details-card">
                <h2>Order Details</h2>
                <div className="order-items">
                    {items?.map((item, index) => (
                        <div key={index} className="order-item">
                            {item.image && <img src={item.image} alt={item.name} />}
                            <div className="item-info">
                                <h4>{item.name}</h4>
                                <p>Qty: {item.quantity} × ₹{item.price}</p>
                            </div>
                            <div className="item-total">₹{(item.quantity * item.price).toFixed(2)}</div>
                        </div>
                    ))}
                </div>
                <div className="order-total">
                    <strong>Total Amount:</strong>
                    <strong>₹{totalAmount?.toFixed(2)}</strong>
                </div>
            </div>

            {/* Delivery Address */}
            <div className="address-card">
                <h3>Delivery Address</h3>
                <p>{shippingAddress?.street}</p>
                <p>{shippingAddress?.city}, {shippingAddress?.state} - {shippingAddress?.pincode}</p>
            </div>

            {/* Rating Section (only for delivered orders) */}
            {status === 'delivered' && !trackingData.deliveryRating && (
                <div className="rating-section">
                    <button onClick={() => setShowRatingModal(true)} className="rate-btn">
                        Rate Your Delivery Experience
                    </button>
                </div>
            )}

            {trackingData.deliveryRating && (
                <div className="rating-display">
                    <h3>Your Rating</h3>
                    <div className="rating-stars">
                        <span>Overall: {'⭐'.repeat(trackingData.deliveryRating.overall)}</span>
                        <span>Packaging: {'⭐'.repeat(trackingData.deliveryRating.packaging)}</span>
                        <span>Freshness: {'⭐'.repeat(trackingData.deliveryRating.freshness)}</span>
                    </div>
                    {trackingData.deliveryRating.comment && (
                        <p className="rating-comment">"{trackingData.deliveryRating.comment}"</p>
                    )}
                </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && (
                <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Rate Your Delivery</h2>
                        <form onSubmit={handleRatingSubmit}>
                            <div className="rating-group">
                                <label>Overall Experience</label>
                                <div className="star-rating">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span
                                            key={star}
                                            className={star <= rating.overall ? 'star active' : 'star'}
                                            onClick={() => setRating({ ...rating, overall: star })}
                                        >
                                            ⭐
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rating-group">
                                <label>Packaging Quality</label>
                                <div className="star-rating">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span
                                            key={star}
                                            className={star <= rating.packaging ? 'star active' : 'star'}
                                            onClick={() => setRating({ ...rating, packaging: star })}
                                        >
                                            ⭐
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rating-group">
                                <label>Product Freshness</label>
                                <div className="star-rating">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span
                                            key={star}
                                            className={star <= rating.freshness ? 'star active' : 'star'}
                                            onClick={() => setRating({ ...rating, freshness: star })}
                                        >
                                            ⭐
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rating-group">
                                <label>Comments (Optional)</label>
                                <textarea
                                    value={rating.comment}
                                    onChange={(e) => setRating({ ...rating, comment: e.target.value })}
                                    placeholder="Share your experience..."
                                    rows="3"
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="submit-btn">Submit Rating</button>
                                <button type="button" onClick={() => setShowRatingModal(false)} className="cancel-btn">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderTracking;
