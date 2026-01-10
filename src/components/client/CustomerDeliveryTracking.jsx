import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './CustomerDeliveryTracking.css';
import DeliveryProgressIndicator from '../admin/DeliveryProgressIndicator';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Dynamic truck icon based on progress
const createTruckIcon = (progress) => {
    let color = '#3b82f6';
    if (progress < 25) color = '#3b82f6';
    else if (progress < 50) color = '#06b6d4';
    else if (progress < 75) color = '#f59e0b';
    else if (progress < 95) color = '#10b981';
    else color = '#eab308';

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

const CustomerDeliveryTracking = ({ order, onClose, user }) => {
    const [truckPosition, setTruckPosition] = useState(null);
    const [progress, setProgress] = useState(0);
    const [remainingMinutes, setRemainingMinutes] = useState(0);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [customerLocation, setCustomerLocation] = useState(null);
    const [deliveryProgress, setDeliveryProgress] = useState(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [route, setRoute] = useState([]);
    const [routeLoading, setRouteLoading] = useState(false);

    const hubLocation = order?.assignedHub?.location || { lat: 22.5726, lng: 88.3639 };

    // Fetch customer location
    useEffect(() => {
        const fetchCustomerLocation = async () => {
            setIsLoadingLocation(true);

            if (order?.deliveryLocation?.coordinates) {
                setCustomerLocation(order.deliveryLocation.coordinates);
                setIsLoadingLocation(false);
                return;
            }

            if (order?.shippingAddress?.coordinates) {
                setCustomerLocation(order.shippingAddress.coordinates);
                setIsLoadingLocation(false);
                return;
            }

            // Fallback to hub
            setCustomerLocation(hubLocation);
            setIsLoadingLocation(false);
        };

        fetchCustomerLocation();
    }, [order]);

    // Fallback: Refetch order data if timer fields are missing
    useEffect(() => {
        const checkAndRefetchOrder = async () => {
            // Only check if order is out for delivery
            if (order?.status !== 'out_for_delivery') return;

            // Check if timer data is missing
            const hasDeliveryProgress = order.deliveryProgress?.startTime && order.deliveryProgress?.estimatedDeliveryMinutes;
            const hasOrderLevelFields = order.deliveryStartTime && order.estimatedDeliveryMinutes;

            if (!hasDeliveryProgress && !hasOrderLevelFields) {
                console.warn('⚠️ Timer data missing, refetching order data...');
                console.log('Current order data:', {
                    orderId: order._id,
                    status: order.status,
                    deliveryProgress: order.deliveryProgress,
                    deliveryStartTime: order.deliveryStartTime,
                    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes
                });

                try {
                    const token = localStorage.getItem('userToken');
                    const response = await axios.get(`/user/orders/${order._id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.data) {
                        console.log('✅ Refetched order data:', {
                            orderId: response.data._id,
                            deliveryProgress: response.data.deliveryProgress,
                            deliveryStartTime: response.data.deliveryStartTime,
                            estimatedDeliveryMinutes: response.data.estimatedDeliveryMinutes
                        });

                        // Update parent component with fresh order data
                        // Since we can't directly update the prop, we'll trigger a re-fetch via progress endpoint
                        fetchDeliveryProgress();
                    }
                } catch (error) {
                    console.error('❌ Error refetching order data:', error);
                }
            }
        };

        checkAndRefetchOrder();
    }, [order?.status, order?._id, order?.deliveryProgress, order?.deliveryStartTime]);

    // Fetch delivery progress
    const fetchDeliveryProgress = async () => {
        if (order?.status !== 'out_for_delivery') return;

        try {
            const token = localStorage.getItem('userToken');
            // Use user-accessible endpoint instead of admin endpoint
            const response = await axios.get(`/user/orders/${order._id}/progress`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.hasProgress) {
                console.log('📊 Progress data received:', {
                    progress: response.data.progress,
                    remainingMinutes: response.data.remainingMinutes,
                    estimatedMinutes: response.data.estimatedMinutes,
                    startTime: response.data.startTime,
                    status: response.data.status,
                    reached: response.data.reached
                });

                // Check if partner has arrived (reached = true)
                if (response.data.reached) {
                    console.log('📍 Partner has ARRIVED - waiting for OTP confirmation');
                    setDeliveryProgress({
                        ...response.data,
                        message: 'Partner has arrived! Share your OTP to complete delivery'
                    });
                    setProgress(100);
                    setRemainingMinutes(0);
                    setRemainingSeconds(0);
                    return;
                }

                setDeliveryProgress(response.data);
                setProgress(response.data.progress);

                // Calculate initial timer values
                const now = new Date();
                let startTime, estimatedMinutes;

                // Try deliveryProgress from response
                if (response.data.startTime && response.data.estimatedMinutes) {
                    startTime = new Date(response.data.startTime);
                    estimatedMinutes = response.data.estimatedMinutes;
                }
                // Fallback to order fields
                else if (order.deliveryStartTime && order.estimatedDeliveryMinutes) {
                    startTime = new Date(order.deliveryStartTime);
                    estimatedMinutes = order.estimatedDeliveryMinutes;
                }

                if (startTime && estimatedMinutes) {
                    const elapsedMinutes = (now - startTime) / (1000 * 60);
                    const remaining = estimatedMinutes - elapsedMinutes;

                    console.log('🎯 Initial timer set:', {
                        estimatedMinutes,
                        elapsedMinutes: elapsedMinutes.toFixed(2),
                        remaining: remaining.toFixed(2)
                    });

                    if (remaining > 0) {
                        setRemainingMinutes(Math.floor(remaining));
                        setRemainingSeconds(Math.round((remaining % 1) * 60));
                    } else {
                        setRemainingMinutes(0);
                        setRemainingSeconds(0);
                    }
                } else {
                    console.warn('⚠️ Could not calculate initial timer - missing data');
                }
            } else {
                console.log('⚠️ No progress data available yet');
                // No progress data yet
                setDeliveryProgress(null);
                setProgress(0);
            }
        } catch (error) {
            console.error('❌ Error fetching delivery progress:', error);
            console.error('Error details:', error.response?.data || error.message);
        }
    };

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (order?.status === 'out_for_delivery') {
            fetchDeliveryProgress();
            const interval = setInterval(fetchDeliveryProgress, 30000);
            return () => clearInterval(interval);
        }
    }, [order?.status, order?._id]);

    // Countdown timer (updates every second based on backend data)
    useEffect(() => {
        if (order?.status === 'out_for_delivery') {
            console.log('🔍 Timer useEffect triggered. Order data:', {
                orderId: order._id,
                status: order.status,
                hasDeliveryProgress: !!deliveryProgress,
                deliveryProgressData: deliveryProgress,
                orderDeliveryStartTime: order.deliveryStartTime,
                orderEstimatedMinutes: order.estimatedDeliveryMinutes,
                orderDeliveryProgress: order.deliveryProgress
            });

            // Calculate remaining time from backend data every second
            const timer = setInterval(() => {
                const now = new Date();
                let startTime, estimatedMinutes;

                // Try to get data from deliveryProgress first (new structure)
                if (deliveryProgress?.startTime && deliveryProgress?.estimatedMinutes) {
                    startTime = new Date(deliveryProgress.startTime);
                    estimatedMinutes = deliveryProgress.estimatedMinutes;
                }
                // Fallback to order fields (old structure)
                else if (order.deliveryStartTime && order.estimatedDeliveryMinutes) {
                    startTime = new Date(order.deliveryStartTime);
                    estimatedMinutes = order.estimatedDeliveryMinutes;
                }
                // Fallback to deliveryProgress in order object
                else if (order.deliveryProgress?.startTime && order.deliveryProgress?.estimatedDeliveryMinutes) {
                    startTime = new Date(order.deliveryProgress.startTime);
                    estimatedMinutes = order.deliveryProgress.estimatedDeliveryMinutes;
                }

                if (startTime && estimatedMinutes) {
                    const elapsedMinutes = (now - startTime) / (1000 * 60);
                    const remaining = estimatedMinutes - elapsedMinutes;

                    if (remaining > 0) {
                        setRemainingMinutes(Math.floor(remaining));
                        setRemainingSeconds(Math.round((remaining % 1) * 60));
                    } else {
                        setRemainingMinutes(0);
                        setRemainingSeconds(0);
                    }
                } else {
                    console.error('❌ TIMER DATA MISSING! Available data:', {
                        hasDeliveryProgress: !!deliveryProgress,
                        deliveryProgressStartTime: deliveryProgress?.startTime,
                        deliveryProgressEstimated: deliveryProgress?.estimatedMinutes,
                        hasOrderStartTime: !!order.deliveryStartTime,
                        orderStartTime: order.deliveryStartTime,
                        hasOrderEstimated: !!order.estimatedDeliveryMinutes,
                        orderEstimated: order.estimatedDeliveryMinutes,
                        orderDeliveryProgress: order.deliveryProgress
                    });
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [order?.status, deliveryProgress, order]);

    // Fetch route from OSRM API (follows actual roads like admin map)
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
                console.log('🗺️ Customer route fetched:', coordinates.length, 'points');
            } else {
                console.warn('⚠️ OSRM routing failed, using fallback');
                setRoute(calculateFallbackRoute());
            }
        } catch (error) {
            console.error('❌ Error fetching route:', error);
            setRoute(calculateFallbackRoute());
        } finally {
            setRouteLoading(false);
        }
    };

    // Fallback route calculation (curved line)
    const calculateFallbackRoute = () => {
        if (!customerLocation) return [];
        const points = [];
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
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

    // Update truck position based on progress
    useEffect(() => {
        if (!customerLocation || !route.length) return;

        if (order?.status === 'out_for_delivery') {
            if (deliveryProgress) {
                const progressPercent = deliveryProgress.progress;
                const routeIndex = Math.floor((progressPercent / 100) * (route.length - 1));
                if (route[routeIndex]) {
                    setTruckPosition({
                        lat: route[routeIndex][0],
                        lng: route[routeIndex][1]
                    });
                }
            } else {
                setTruckPosition(hubLocation);
                setProgress(0);
            }
        }
    }, [deliveryProgress, customerLocation, order?.status]);

    // Get membership badge info
    console.log('🎖️ Membership Debug:', {
        hasUser: !!user,
        userLoyaltyBadge: user?.loyaltyBadge,
        orderUserId: order?.userId,
        orderUserIdLoyaltyBadge: order?.userId?.loyaltyBadge
    });

    // Try to get membership tier from user prop first, then from order.userId
    const membershipTier = user?.loyaltyBadge?.type || order?.userId?.loyaltyBadge?.type || 'none';

    console.log('🎖️ Detected membership tier:', membershipTier);

    const membershipColors = {
        platinum: 'linear-gradient(135deg, #e5e4e2, #9370db)',
        gold: 'linear-gradient(135deg, #ffd700, #ffb347)',
        silver: 'linear-gradient(135deg, #c0c0c0, #a8a8a8)',
        none: '#667eea'
    };

    // Get timer color based on urgency
    const getTimerColor = () => {
        if (remainingMinutes > 10) return '#10b981'; // Green
        if (remainingMinutes > 5) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    // HOLDING STATUS - Show banner if order is on hold
    if (order?.status === 'holding') {
        return (
            <div className="delivery-tracking-modal">
                <div className="tracking-header">
                    <h2>📦 Order Status</h2>
                    <button onClick={onClose} className="close-btn">✕</button>
                </div>

                <div className="holding-status-banner">
                    <div className="banner-icon">⚠️</div>
                    <h3>Order On Hold</h3>
                    <p className="banner-message">No Hub is available right now</p>
                    <p className="banner-reason">{order.holdingReason || 'Your location is outside our current delivery range'}</p>
                    <div className="banner-info">
                        <p>We're working to expand our delivery network. You'll be notified when delivery becomes available in your area.</p>
                    </div>
                </div>

                <div className="order-details-card">
                    <h4>Order Details</h4>
                    <div className="detail-row">
                        <span>Order ID:</span>
                        <strong>#{order._id?.slice(-6).toUpperCase()}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Status:</span>
                        <span className="status-badge status-holding">HOLDING</span>
                    </div>
                    <div className="detail-row">
                        <span>Order Date:</span>
                        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        );
    }

    // BEFORE OUT_FOR_DELIVERY - Show static order details only
    if (order?.status !== 'out_for_delivery') {
        return (
            <div className="delivery-tracking-modal">
                <div className="tracking-header">
                    <h2>📦 Order Status</h2>
                    <button onClick={onClose} className="close-btn">✕</button>
                </div>

                <div className="order-details-card">
                    <h4>Order Details</h4>
                    <div className="detail-row">
                        <span>Order ID:</span>
                        <strong>#{order._id?.slice(-6).toUpperCase()}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Status:</span>
                        <span className={`status-badge status-${order.status}`}>
                            {order.status?.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span>Order Date:</span>
                        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                    </div>
                    {order.estimatedDeliveryMinutes && (
                        <div className="detail-row">
                            <span>Estimated Delivery:</span>
                            <span>{order.estimatedDeliveryMinutes} minutes (once dispatched)</span>
                        </div>
                    )}
                </div>

                <div className="status-timeline">
                    <div className={`timeline-step ${['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered'].indexOf(order.status) >= 0 ? 'completed' : ''}`}>
                        <div className="step-icon">📝</div>
                        <div className="step-label">Pending</div>
                    </div>
                    <div className={`timeline-step ${['confirmed', 'packed', 'out_for_delivery', 'delivered'].indexOf(order.status) >= 0 ? 'completed' : ''}`}>
                        <div className="step-icon">✅</div>
                        <div className="step-label">Confirmed</div>
                    </div>
                    <div className={`timeline-step ${['packed', 'out_for_delivery', 'delivered'].indexOf(order.status) >= 0 ? 'completed' : ''}`}>
                        <div className="step-icon">📦</div>
                        <div className="step-label">Packed</div>
                    </div>
                    <div className={`timeline-step ${['out_for_delivery', 'delivered'].indexOf(order.status) >= 0 ? 'completed' : ''}`}>
                        <div className="step-icon">🚚</div>
                        <div className="step-label">Out for Delivery</div>
                    </div>
                    <div className={`timeline-step ${order.status === 'delivered' ? 'completed' : ''}`}>
                        <div className="step-icon">🎉</div>
                        <div className="step-label">Delivered</div>
                    </div>
                </div>
            </div>
        );
    }

    // LOADING STATE
    if (isLoadingLocation) {
        return (
            <div className="delivery-tracking-modal">
                <div className="tracking-header">
                    <h2>🚚 Track Your Delivery</h2>
                    <button onClick={onClose} className="close-btn">✕</button>
                </div>
                <div style={{ padding: '40px', textAlign: 'center', color: '#f1f5f9' }}>
                    <p>Loading delivery information...</p>
                </div>
            </div>
        );
    }

    // OUT_FOR_DELIVERY - Show full tracking UI with map
    return (
        <div className="delivery-tracking-modal map-revealed">
            <div className="tracking-header">
                <h2>🚚 Track Your Delivery</h2>
                <button onClick={onClose} className="close-btn">✕</button>
            </div>

            {/* WAITING FOR CONFIRMATION Banner - when partner has arrived */}
            {deliveryProgress?.reached && (
                <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    padding: '20px',
                    margin: '0 20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    animation: 'pulse 2s infinite'
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>📍</div>
                    <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '20px' }}>
                        PARTNER HAS ARRIVED!
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 15px 0', fontSize: '14px' }}>
                        Share your OTP with the delivery partner to complete delivery
                    </p>
                    {order?.deliveryOTP && (
                        <div style={{
                            background: 'rgba(255,255,255,0.2)',
                            padding: '15px 30px',
                            borderRadius: '12px',
                            display: 'inline-block'
                        }}>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '5px' }}>
                                YOUR DELIVERY OTP
                            </div>
                            <div style={{ fontSize: '36px', fontWeight: '700', color: 'white', letterSpacing: '8px' }}>
                                {order.deliveryOTP}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Membership Badge */}
            {membershipTier !== 'none' && (
                <div className="membership-perk-badge" style={{ background: membershipColors[membershipTier] }}>
                    <span className="badge-tier">⚡ {membershipTier.toUpperCase()} DELIVERY</span>
                    <span className="badge-eta">{remainingMinutes}:{remainingSeconds.toString().padStart(2, '0')} ETA</span>
                </div>
            )}

            {/* Countdown Timer */}
            <div className="countdown-timer" style={{ borderColor: getTimerColor() }}>
                <div className="timer-label">Arriving in</div>
                <div className="timer-display" style={{ color: getTimerColor() }}>
                    {remainingMinutes}:{remainingSeconds.toString().padStart(2, '0')}
                </div>
                <div className="timer-sublabel">minutes</div>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar-container">
                <div className="progress-labels-top">
                    <span>🏪 Hub</span>
                    <span className="progress-percent">{Math.min(100, Math.round(progress))}%</span>
                    <span>📍 You</span>
                </div>
                <div className="progress-bar-track">
                    <div
                        className="progress-bar-fill"
                        style={{
                            width: `${Math.min(100, progress)}%`,
                            background: membershipColors[membershipTier]
                        }}
                    />
                </div>
            </div>

            {/* Delivery Progress Indicator */}
            {deliveryProgress && (
                <div className="progress-indicator-wrapper">
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

            {/* Map with smooth reveal animation */}
            <div className="map-container">
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
                            <strong>🏪 {order.assignedHub?.name || 'Hub'}</strong>
                        </Popup>
                    </Marker>

                    <Marker position={[customerLocation.lat, customerLocation.lng]}>
                        <Popup>
                            <strong>📍 Your Location</strong><br />
                            {order?.shippingAddress?.city || 'Delivery Address'}
                        </Popup>
                    </Marker>

                    {truckPosition && (
                        <Marker position={[truckPosition.lat, truckPosition.lng]} icon={createTruckIcon(progress)}>
                            <Popup>
                                <strong>🚚 Your Delivery</strong><br />
                                {Math.round(progress)}% complete<br />
                                ETA: {remainingMinutes}:{remainingSeconds.toString().padStart(2, '0')}
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            <div className="tracking-footer">
                <p className="footer-message">
                    <strong>Your order is on the way!</strong>
                </p>
                <p className="footer-update">
                    Updates every 30 seconds • Live tracking
                </p>
            </div>
        </div>
    );
};

export default CustomerDeliveryTracking;
