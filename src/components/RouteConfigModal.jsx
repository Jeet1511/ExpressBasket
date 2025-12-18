import React, { useState, useEffect } from 'react';
import axios from '../utils/axios.js';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './RouteConfigModal.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RouteConfigModal = ({ order, onClose, onRouteSet }) => {
    const [packagingPoints, setPackagingPoints] = useState([]);
    const [selectedPackaging, setSelectedPackaging] = useState(null);
    const [waypoints, setWaypoints] = useState([]);
    const [newWaypoint, setNewWaypoint] = useState({ name: '', address: '', pincode: '' });
    const [expressDelivery, setExpressDelivery] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPackagingPoints();
        // Pre-populate existing route for editing
        if (order.packagingPoint) setSelectedPackaging(order.packagingPoint);
        if (order.routeWaypoints?.length > 0) setWaypoints(order.routeWaypoints);
        if (order.deliveryTiming?.expressDelivery) setExpressDelivery(true);
    }, [order]);

    const fetchPackagingPoints = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get('/admin/packaging-points', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPackagingPoints(response.data);

            // Set first as default
            if (response.data.length > 0) {
                setSelectedPackaging(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching packaging points:', error);
        }
    };

    const handleAddWaypoint = () => {
        if (newWaypoint.name && (newWaypoint.address || newWaypoint.pincode)) {
            setWaypoints([...waypoints, { ...newWaypoint, coordinates: null }]);
            setNewWaypoint({ name: '', address: '', pincode: '' });
        }
    };

    const handleRemoveWaypoint = (index) => {
        setWaypoints(waypoints.filter((_, i) => i !== index));
    };

    const handleConfirmRoute = async () => {
        if (!selectedPackaging) {
            alert('Please select a packaging point');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.post(`/admin/orders/${order._id}/set-route`, {
                packagingPoint: selectedPackaging,
                waypoints,
                membershipType: order.userId?.loyaltyBadge?.type || 'none',
                expressDelivery
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Route configured! Delivery time: ${response.data.deliveryTime}`);
            onRouteSet();
            onClose();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to set route');
        } finally {
            setLoading(false);
        }
    };

    // Build route points for map
    const getRoutePoints = () => {
        const points = [];

        if (selectedPackaging?.coordinates) {
            points.push(selectedPackaging.coordinates);
        }

        waypoints.forEach(wp => {
            if (wp.coordinates) {
                points.push(wp.coordinates);
            }
        });

        if (order.shippingAddress?.coordinates) {
            points.push(order.shippingAddress.coordinates);
        }

        return points;
    };

    const routePoints = getRoutePoints();
    const mapCenter = selectedPackaging?.coordinates || { lat: 22.5726, lng: 88.3639 };

    // Get membership info
    const membershipType = order.userId?.loyaltyBadge?.type || 'none';
    const showExpressOption = membershipType === 'gold';

    return (
        <div className="route-modal-overlay" onClick={onClose}>
            <div className="route-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="route-modal-header">
                    <h2>🗺️ Configure Delivery Route</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="route-modal-body">
                    {/* Order Info */}
                    <div className="order-info-section">
                        <h3>Order #{order._id.slice(-8)}</h3>
                        <p>Customer: {order.userId?.name || 'Unknown'}</p>
                        <p>Membership: <span className={`membership-badge ${membershipType}`}>
                            {membershipType.toUpperCase()}
                        </span></p>
                    </div>

                    {/* Packaging Point */}
                    <div className="config-section">
                        <h3>🏭 Packaging Point</h3>
                        <select
                            value={packagingPoints.findIndex(p => p.name === selectedPackaging?.name)}
                            onChange={(e) => setSelectedPackaging(packagingPoints[e.target.value])}
                            className="packaging-select"
                        >
                            {packagingPoints.map((point, idx) => (
                                <option key={idx} value={idx}>{point.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Waypoints */}
                    <div className="config-section">
                        <h3>📍 Route Waypoints (Optional)</h3>
                        <div className="waypoints-list">
                            {waypoints.map((wp, idx) => (
                                <div key={idx} className="waypoint-item">
                                    <span className="waypoint-number">{idx + 1}</span>
                                    <div className="waypoint-info">
                                        <strong>{wp.name}</strong>
                                        <small>{wp.address}</small>
                                    </div>
                                    <button
                                        className="remove-btn"
                                        onClick={() => handleRemoveWaypoint(idx)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="add-waypoint">
                            <input
                                type="text"
                                placeholder="Place name (e.g., Barddhaman)"
                                value={newWaypoint.name}
                                onChange={(e) => setNewWaypoint({ ...newWaypoint, name: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Pincode (e.g., 713101)"
                                value={newWaypoint.pincode}
                                onChange={(e) => setNewWaypoint({ ...newWaypoint, pincode: e.target.value })}
                                maxLength="6"
                            />
                            <button onClick={handleAddWaypoint} className="add-btn">+ Add</button>
                        </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="config-section">
                        <h3>🏠 Delivery Address</h3>
                        <p>{order.shippingAddress?.street}, {order.shippingAddress?.city} {order.shippingAddress?.pincode}</p>
                    </div>

                    {/* Map Preview */}
                    <div className="config-section">
                        <h3>🗺️ Route Preview</h3>
                        <div className="map-preview">
                            {routePoints.length >= 2 ? (
                                <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={8} style={{ height: '300px', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                                    {/* Packaging Point */}
                                    {selectedPackaging?.coordinates && (
                                        <Marker position={[selectedPackaging.coordinates.lat, selectedPackaging.coordinates.lng]}>
                                            <Popup>🏭 {selectedPackaging.name}</Popup>
                                        </Marker>
                                    )}

                                    {/* Waypoints */}
                                    {waypoints.map((wp, idx) => wp.coordinates && (
                                        <Marker key={idx} position={[wp.coordinates.lat, wp.coordinates.lng]}>
                                            <Popup>📍 {wp.name}</Popup>
                                        </Marker>
                                    ))}

                                    {/* Destination */}
                                    {order.shippingAddress?.coordinates && (
                                        <Marker position={[order.shippingAddress.coordinates.lat, order.shippingAddress.coordinates.lng]}>
                                            <Popup>🏠 Delivery Address</Popup>
                                        </Marker>
                                    )}

                                    {/* Route Line */}
                                    <Polyline positions={routePoints.map(p => [p.lat, p.lng])} color="#28a745" weight={4} />
                                </MapContainer>
                            ) : (
                                <div className="map-placeholder">
                                    <p>Select packaging point to preview route</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Delivery Options */}
                    <div className="config-section">
                        <h3>⏱️ Delivery Time</h3>
                        <div className="delivery-timing">
                            {membershipType === 'none' && <p>Standard: 25-30 minutes</p>}
                            {membershipType === 'silver' && <p>Silver: 20-25 minutes</p>}
                            {membershipType === 'gold' && (
                                <>
                                    <p>Gold: 20-25 minutes</p>
                                    <label className="express-option">
                                        <input
                                            type="checkbox"
                                            checked={expressDelivery}
                                            onChange={(e) => setExpressDelivery(e.target.checked)}
                                        />
                                        Express Delivery (16 mins) - ₹10 extra
                                    </label>
                                </>
                            )}
                            {membershipType === 'platinum' && <p>Platinum: Under 12 minutes ⚡</p>}
                        </div>
                    </div>
                </div>

                <div className="route-modal-footer">
                    <button className="cancel-btn" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button
                        className="confirm-btn"
                        onClick={handleConfirmRoute}
                        disabled={loading || !selectedPackaging}
                    >
                        {loading ? 'Setting Route...' : '✓ Confirm Route'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RouteConfigModal;
