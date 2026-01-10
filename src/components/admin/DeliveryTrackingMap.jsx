import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './DeliveryTrackingMap.css';
import DeliveryProgressIndicator from './DeliveryProgressIndicator';
import { Truck, X, Package, User, Clock, Crown, Warehouse, MapPin } from 'lucide-react';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Function to create truck icon with dynamic color based on progress
const createTruckIcon = (progress) => {
    let color = '#3b82f6'; // Blue - default

    if (progress < 25) {
        color = '#3b82f6'; // Blue - Just started
    } else if (progress < 50) {
        color = '#06b6d4'; // Cyan - On the way
    } else if (progress < 75) {
        color = '#f59e0b'; // Orange - Halfway there
    } else if (progress < 95) {
        color = '#10b981'; // Green - Almost there
    } else {
        color = '#eab308'; // Gold - Arriving now
    }

    return new L.Icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${color}">
                <path d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m1.5-9l1.96 2.5H17V9.5M6 18.5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-5l-3-4Z"/>
            </svg>
        `),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};

// Hub icon
const hubIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#4CAF50">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
        </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

const DeliveryTrackingMap = ({ order, onClose }) => {
    const [truckPosition, setTruckPosition] = useState(null);
    const [progress, setProgress] = useState(0);
    const [remainingMinutes, setRemainingMinutes] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [customerLocation, setCustomerLocation] = useState(null);
    const animationRef = useRef(null);

    // Delivery progress tracking state
    const [deliveryProgress, setDeliveryProgress] = useState(null);
    const [progressLoading, setProgressLoading] = useState(false);

    // Get hub location from order (assigned by backend)
    const hubLocation = order?.assignedHub?.location || { lat: 22.5726, lng: 88.3639 };

    // Fetch customer location on mount
    useEffect(() => {
        const fetchCustomerLocation = async () => {
            // Priority 1: Check deliveryLocation in order
            if (order?.deliveryLocation?.coordinates) {
                setCustomerLocation(order.deliveryLocation.coordinates);
                return;
            }

            // Priority 2: Check shippingAddress coordinates in order
            if (order?.shippingAddress?.coordinates) {
                setCustomerLocation(order.shippingAddress.coordinates);
                return;
            }

            // Priority 3: Fetch from user profile
            if (order?.userId?._id || order?.userId) {
                try {
                    const userId = typeof order.userId === 'string' ? order.userId : order.userId._id;
                    const response = await fetch(`/api/users/${userId}`);
                    const data = await response.json();

                    if (data.user?.deliveryLocation?.coordinates) {
                        setCustomerLocation(data.user.deliveryLocation.coordinates);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching user location:', error);
                }
            }

            // Fallback: Use hub location (will show warning)
            setCustomerLocation(hubLocation);
        };

        fetchCustomerLocation();
    }, [order]);

    // Fetch delivery progress for out_for_delivery orders
    const fetchDeliveryProgress = async () => {
        if (order?.status !== 'out_for_delivery') {
            console.log('⏭️ Skipping progress fetch - order status:', order?.status);
            return;
        }

        console.log('📡 Fetching delivery progress for order:', order._id);

        try {
            setProgressLoading(true);
            const token = localStorage.getItem('adminToken');

            if (!token) {
                console.error('❌ No admin token found!');
                return;
            }

            // FIX: Use /admin/orders instead of /api/admin/orders because axios baseURL already includes /api
            const response = await axios.get(`/admin/orders/${order._id}/progress`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('✅ Progress API Response:', response.data);

            if (response.data.hasProgress) {
                setDeliveryProgress(response.data);
                setProgress(response.data.progress);
                setRemainingMinutes(response.data.remainingMinutes);

                console.log('📊 Updated state:', {
                    progress: response.data.progress,
                    remainingMinutes: response.data.remainingMinutes,
                    message: response.data.message
                });
            } else {
                console.warn('⚠️ No progress data:', response.data.message);
            }
        } catch (error) {
            console.error('❌ Error fetching delivery progress:', error.response?.data || error.message);
        } finally {
            setProgressLoading(false);
        }
    };

    // Auto-refresh delivery progress every 30 seconds for out_for_delivery orders
    useEffect(() => {
        if (order?.status === 'out_for_delivery') {
            // Fetch immediately
            fetchDeliveryProgress();

            // Set up interval for auto-refresh
            const interval = setInterval(fetchDeliveryProgress, 30000); // 30 seconds

            return () => clearInterval(interval);
        }
    }, [order?.status, order?._id]);

    // Get delivery time from order (generated once by backend)
    const deliveryTimeMinutes = order?.estimatedDeliveryMinutes || 30;

    // Get membership tier for display
    console.log('🎖️ Admin Map Membership Debug:', {
        hasUserId: !!order?.userId,
        userId: order?.userId,
        loyaltyBadge: order?.userId?.loyaltyBadge,
        badgeType: order?.userId?.loyaltyBadge?.type
    });

    const membershipTier = order?.userId?.loyaltyBadge?.type || 'none';

    console.log('🎖️ Admin Map Detected tier:', membershipTier);

    // State for storing the calculated route
    const [route, setRoute] = useState([]);
    const [routeLoading, setRouteLoading] = useState(false);

    // Fetch route from OSRM API (follows actual roads)
    const fetchRoute = async () => {
        if (!customerLocation) return;

        setRouteLoading(true);
        try {
            // OSRM API endpoint (free public server)
            const url = `https://router.project-osrm.org/route/v1/driving/${hubLocation.lng},${hubLocation.lat};${customerLocation.lng},${customerLocation.lat}?overview=full&geometries=geojson`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes[0]) {
                // Convert GeoJSON coordinates to Leaflet format [lat, lng]
                const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                setRoute(coordinates);
                console.log('🗺️ Route fetched successfully:', coordinates.length, 'points');
            } else {
                console.warn('⚠️ OSRM routing failed, using fallback');
                // Fallback to straight line with curve
                setRoute(calculateFallbackRoute());
            }
        } catch (error) {
            console.error('❌ Error fetching route:', error);
            // Fallback to straight line with curve
            setRoute(calculateFallbackRoute());
        } finally {
            setRouteLoading(false);
        }
    };

    // Fallback route calculation (curved line)
    const calculateFallbackRoute = () => {
        if (!customerLocation) return [];

        const points = [];
        const steps = 100;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const curveFactor = Math.sin(t * Math.PI) * 0.02;

            const lat = hubLocation.lat + (customerLocation.lat - hubLocation.lat) * t + curveFactor;
            const lng = hubLocation.lng + (customerLocation.lng - hubLocation.lng) * t + curveFactor;

            points.push([lat, lng]);
        }

        return points;
    };

    // Fetch route when customer location changes
    useEffect(() => {
        if (customerLocation) {
            fetchRoute();
        }
    }, [customerLocation]);

    // Calculate remaining time from expected arrival
    const calculateRemainingTime = () => {
        if (!order?.expectedArrivalTime) return deliveryTimeMinutes;

        const now = new Date();
        const expected = new Date(order.expectedArrivalTime);
        const remainingMs = expected - now;
        const remaining = Math.max(0, Math.ceil(remainingMs / 1000 / 60));

        return remaining;
    };

    // Update truck position based on real-time delivery progress
    const prevProgressRef = useRef(null);

    useEffect(() => {
        if (!customerLocation || !route.length) return;

        // For out_for_delivery orders, use real-time progress from backend
        if (order?.status === 'out_for_delivery') {
            if (deliveryProgress) {
                const progressPercent = deliveryProgress.progress;

                // Only update if progress actually changed (prevent blinking)
                if (prevProgressRef.current !== progressPercent) {
                    console.log('🚚 Truck Position Update:', {
                        status: order?.status,
                        progress: progressPercent,
                        routeLength: route.length
                    });

                    // Update progress and remaining time from backend
                    setProgress(progressPercent);
                    setRemainingMinutes(deliveryProgress.remainingMinutes);

                    // Calculate truck position along route based on progress
                    const routeIndex = Math.min(
                        Math.floor((progressPercent / 100) * (route.length - 1)),
                        route.length - 1
                    );

                    if (route[routeIndex]) {
                        setTruckPosition({
                            lat: route[routeIndex][0],
                            lng: route[routeIndex][1]
                        });
                    }

                    prevProgressRef.current = progressPercent;
                }
            } else {
                // If progress data not loaded yet, start truck at hub
                if (!truckPosition) {
                    setTruckPosition(hubLocation);
                    setProgress(0);
                }
            }

            // Enable animation to show truck marker
            setIsAnimating(true);
        } else {
            // For other statuses, start truck at hub
            setTruckPosition(hubLocation);
            setRemainingMinutes(calculateRemainingTime());
        }
    }, [deliveryProgress?.progress, customerLocation, route.length, order?.status]);

    const getMembershipColor = (tier) => {
        const colors = {
            'platinum': { bg: '#1a1a2e', border: '#7c3aed', text: '#c4b5fd' },
            'gold': { bg: '#1c1917', border: '#ca8a04', text: '#fcd34d' },
            'silver': { bg: '#1e1e1e', border: '#6b7280', text: '#d1d5db' },
            'bronze': { bg: '#1c1412', border: '#b45309', text: '#fdba74' },
            'none': { bg: '#1e293b', border: '#475569', text: '#94a3b8' }
        };
        return colors[tier?.toLowerCase()] || colors['none'];
    };

    // Don't render until customer location is loaded
    if (!customerLocation) {
        return (
            <div className="delivery-tracking-modal">
                <div className="tracking-header">
                    <h2><Truck size={24} /> Live Delivery Tracking</h2>
                    <button onClick={onClose} className="close-btn"><X size={20} /></button>
                </div>
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading delivery location...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="delivery-tracking-modal">
            <div className="tracking-header">
                <h2><Truck size={24} /> Live Delivery Tracking</h2>
                <button onClick={onClose} className="close-btn"><X size={20} /></button>
            </div>

            <div className="tracking-info">
                <div className="info-card">
                    <div className="info-label"><Warehouse size={14} /> HUB</div>
                    <div className="info-value">{order?.assignedHub?.name || 'Default Hub'}</div>
                </div>
                <div className="info-card">
                    <div className="info-label"><Package size={14} /> ORDER</div>
                    <div className="info-value">#{order?._id?.slice(-6)}</div>
                </div>
                <div className="info-card">
                    <div className="info-label"><User size={14} /> CUSTOMER</div>
                    <div className="info-value">{order?.userId?.name}</div>
                </div>
                <div className="info-card membership" style={{
                    background: getMembershipColor(membershipTier).bg,
                    borderColor: getMembershipColor(membershipTier).border,
                    color: getMembershipColor(membershipTier).text
                }}>
                    <div className="info-label"><Crown size={14} /> MEMBERSHIP</div>
                    <div className="info-value">{membershipTier.toUpperCase()}</div>
                </div>
                <div className="info-card">
                    <div className="info-label"><Clock size={14} /> ETA</div>
                    <div className="info-value">{remainingMinutes} min</div>
                </div>
            </div>

            {/* Show delivery progress indicator for out_for_delivery orders */}
            {order?.status === 'out_for_delivery' && deliveryProgress && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    margin: '10px 0'
                }}>
                    <DeliveryProgressIndicator
                        progress={deliveryProgress.progress}
                        timeRemaining={deliveryProgress.remainingTime}
                        statusMessage={deliveryProgress.message}
                        isDelayed={deliveryProgress.isDelayed}
                        color={deliveryProgress.color}
                        size="large"
                    />
                </div>
            )}

            {/* Fallback progress bar for other statuses or when progress data is loading */}
            {(!deliveryProgress || order?.status !== 'out_for_delivery') && (
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    <span className="progress-text">{Math.round(progress)}% Complete</span>
                </div>
            )}

            <MapContainer
                center={[
                    (hubLocation.lat + customerLocation.lat) / 2,
                    (hubLocation.lng + customerLocation.lng) / 2
                ]}
                zoom={13}
                className="delivery-map"
                scrollWheelZoom={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                <Polyline
                    positions={route}
                    color="#667eea"
                    weight={4}
                    opacity={0.7}
                />

                <Marker position={[hubLocation.lat, hubLocation.lng]} icon={hubIcon}>
                    <Popup>
                        <strong>🏪 {order?.assignedHub?.name || 'Hub'}</strong>
                    </Popup>
                </Marker>

                <Marker position={[customerLocation.lat, customerLocation.lng]}>
                    <Popup>
                        <strong>📍 Delivery Location</strong><br />
                        {order?.shippingAddress?.city || 'Customer Location'}
                    </Popup>
                </Marker>

                {/* Show truck marker for out_for_delivery orders */}
                {order?.status === 'out_for_delivery' && truckPosition && (
                    <Marker position={[truckPosition.lat, truckPosition.lng]} icon={createTruckIcon(progress)}>
                        <Popup>
                            <strong>🚚 Delivery Truck</strong><br />
                            {Math.round(progress)}% complete<br />
                            ETA: {remainingMinutes} min<br />
                            <small>Position: {truckPosition.lat.toFixed(4)}, {truckPosition.lng.toFixed(4)}</small>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            <div className="tracking-controls">
                <div style={{ textAlign: 'center', color: '#f1f5f9' }}>
                    <p style={{ margin: '10px 0', fontSize: '14px' }}>
                        <strong>Delivery Time:</strong> {deliveryTimeMinutes} minutes
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '12px', opacity: 0.8 }}>
                        Based on {membershipTier.toUpperCase()} membership
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DeliveryTrackingMap;
