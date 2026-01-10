import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from '../../utils/axios';
import 'leaflet/dist/leaflet.css';
import './PartnerNavigationMap.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Truck icon for partner location (same as customer map)
const createTruckIcon = (progress) => {
    let color = '#10b981'; // Green default

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

// Hub icon (same green house as customer map)
const hubIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#4CAF50">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
        </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

// Customer location icon (red marker)
const customerIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Map auto-fit component
const FitBounds = ({ positions }) => {
    const map = useMap();
    useEffect(() => {
        if (positions && positions.length >= 2) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, positions]);
    return null;
};

const PartnerNavigationMap = ({ delivery, onClose }) => {
    const [route, setRoute] = useState([]);
    const [hubLocation, setHubLocation] = useState(null);
    const [customerLocation, setCustomerLocation] = useState(null);
    const [truckPosition, setTruckPosition] = useState(null);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (delivery) {
            initializeMap();
        }
    }, [delivery]);

    const initializeMap = async () => {
        setLoading(true);

        // Get hub location ONLY from order's assignedHub (same as customer map)
        // DO NOT use delivery.pickupLocation as it has Delhi defaults in schema
        const order = delivery.order;

        // Only use assignedHub if it has valid coordinates
        let hub = null;
        if (order?.assignedHub?.location?.lat && order?.assignedHub?.location?.lng) {
            hub = order.assignedHub.location;
            console.log('📍 Using order.assignedHub:', hub);
        }

        if (hub) {
            setHubLocation({ lat: hub.lat, lng: hub.lng });
        } else {
            // Default hub location - SAME AS CUSTOMER MAP (Kolkata)
            console.log('📍 No assignedHub found, using Kolkata default');
            setHubLocation({ lat: 22.5726, lng: 88.3639 });
        }

        // Get customer location from delivery (same priority as customer map)
        let custLoc = null;

        // Priority 1: deliveryLocation coordinates in delivery record
        if (delivery.deliveryLocation?.coordinates?.lat && delivery.deliveryLocation?.coordinates?.lng) {
            custLoc = {
                lat: delivery.deliveryLocation.coordinates.lat,
                lng: delivery.deliveryLocation.coordinates.lng
            };
        }
        // Priority 2: Order's deliveryLocation
        else if (order?.deliveryLocation?.coordinates) {
            custLoc = order.deliveryLocation.coordinates;
        }
        // Priority 3: Order's shippingAddress coordinates
        else if (order?.shippingAddress?.coordinates) {
            custLoc = order.shippingAddress.coordinates;
        }

        if (custLoc) {
            setCustomerLocation(custLoc);
        } else {
            // Fallback - try to geocode the address
            const address = delivery.deliveryLocation?.address;
            if (address) {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                    const data = await response.json();
                    if (data && data.length > 0) {
                        custLoc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                        setCustomerLocation(custLoc);
                    }
                } catch (e) {
                    console.log('Geocoding failed:', e);
                }
            }
        }

        // Set truck position - use delivery progress if available
        const hubLoc = hub || { lat: 22.5726, lng: 88.3639 };
        const finalCustLoc = custLoc || hubLoc;

        // Calculate truck position based on order progress
        const orderProgress = order?.deliveryProgress?.currentProgress || 0;
        setProgress(orderProgress);

        if (orderProgress > 0) {
            // Position truck along the route based on progress
            const progressFactor = orderProgress / 100;
            setTruckPosition({
                lat: hubLoc.lat + (finalCustLoc.lat - hubLoc.lat) * progressFactor,
                lng: hubLoc.lng + (finalCustLoc.lng - hubLoc.lng) * progressFactor
            });
        } else {
            // Start at hub
            setTruckPosition(hubLoc);
        }

        setLoading(false);

        // Fetch route
        if (custLoc) {
            fetchRoute(hubLoc.lat, hubLoc.lng, custLoc.lat, custLoc.lng);
        }
    };

    const fetchRoute = async (startLat, startLng, endLat, endLng) => {
        try {
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
            );
            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const coordinates = data.routes[0].geometry.coordinates;
                const routePoints = coordinates.map(coord => [coord[1], coord[0]]);
                setRoute(routePoints);

                // Update truck position on route if we have progress
                if (progress > 0 && routePoints.length > 0) {
                    const routeIndex = Math.min(
                        Math.floor((progress / 100) * (routePoints.length - 1)),
                        routePoints.length - 1
                    );
                    setTruckPosition({
                        lat: routePoints[routeIndex][0],
                        lng: routePoints[routeIndex][1]
                    });
                }
            } else {
                // Fallback: direct line
                setRoute([[startLat, startLng], [endLat, endLng]]);
            }
        } catch (error) {
            console.error('Route fetch error:', error);
            setRoute([[startLat, startLng], [endLat, endLng]]);
        }
    };

    const openInGoogleMaps = () => {
        const address = encodeURIComponent(delivery?.deliveryLocation?.address || '');
        window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
    };

    if (loading || !hubLocation || !customerLocation) {
        return (
            <div className="partner-nav-map-modal">
                <div className="map-loading">
                    <div className="spinner"></div>
                    <p>Loading map...</p>
                </div>
            </div>
        );
    }

    const allPositions = [
        [hubLocation.lat, hubLocation.lng],
        [customerLocation.lat, customerLocation.lng]
    ];

    return (
        <div className="partner-nav-map-modal">
            <div className="map-header">
                <div className="header-info">
                    <h2>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        Live Delivery Tracking
                    </h2>
                    <p>Order #{delivery?.order?._id?.slice(-6)} • {delivery?.order?.userId?.name}</p>
                </div>
                <div className="header-actions">
                    <button className="google-maps-btn" onClick={openInGoogleMaps}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Open in Google Maps
                    </button>
                    <button className="close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="delivery-progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                <span className="progress-text">{Math.round(progress)}% Complete</span>
            </div>

            <div className="map-container">
                <MapContainer
                    center={[
                        (hubLocation.lat + customerLocation.lat) / 2,
                        (hubLocation.lng + customerLocation.lng) / 2
                    ]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />

                    <FitBounds positions={allPositions} />

                    {/* Route line - same purple color as customer map */}
                    {route.length > 0 && (
                        <Polyline
                            positions={route}
                            color="#667eea"
                            weight={4}
                            opacity={0.7}
                        />
                    )}

                    {/* Hub/Store marker */}
                    <Marker position={[hubLocation.lat, hubLocation.lng]} icon={hubIcon}>
                        <Popup>
                            <strong>🏪 {delivery?.order?.assignedHub?.name || 'Hub'}</strong><br />
                            Pickup Location
                        </Popup>
                    </Marker>

                    {/* Customer marker */}
                    <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon}>
                        <Popup>
                            <strong>📍 Delivery Location</strong><br />
                            {delivery?.deliveryLocation?.address}<br />
                            <small>Customer: {delivery?.order?.userId?.name}</small>
                        </Popup>
                    </Marker>

                    {/* Truck (You) marker */}
                    {truckPosition && (
                        <Marker position={[truckPosition.lat, truckPosition.lng]} icon={createTruckIcon(progress)}>
                            <Popup>
                                <strong>🚚 You are here</strong><br />
                                {Math.round(progress)}% complete
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            <div className="map-legend">
                <div className="legend-item">
                    <span className="legend-dot hub"></span>
                    <span>Hub (Pickup)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot partner"></span>
                    <span>Your Location</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot customer"></span>
                    <span>Customer</span>
                </div>
            </div>
        </div>
    );
};

export default PartnerNavigationMap;
