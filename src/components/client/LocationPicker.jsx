import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom red pin icon
const redPinIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#EF4444">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        }
    });
    return null;
}

const LocationPicker = ({ initialLocation, onSave, onCancel }) => {
    const [markerPosition, setMarkerPosition] = useState(
        initialLocation || { lat: 22.5726, lng: 88.3639 } // Default to Kolkata
    );
    const [mapCenter, setMapCenter] = useState(markerPosition);
    const [address, setAddress] = useState('');
    const [addressComponents, setAddressComponents] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hubWarning, setHubWarning] = useState('');
    const markerRef = useRef(null);

    // Reverse geocode to get address
    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await response.json();
            setAddress(data.display_name || 'Unknown location');
            // Save address components for backend
            setAddressComponents(data.address || {});
        } catch (error) {
            console.error('Geocoding error:', error);
            setAddress('Unable to fetch address');
            setAddressComponents(null);
        }
    };

    // Check hub availability
    const checkHubAvailability = async (lat, lng) => {
        try {
            // Import hub selection utility
            const { findNearestHub } = await import('../../utils/hubSelection');
            const nearestHub = findNearestHub({ lat, lng });

            if (!nearestHub) {
                setHubWarning('⚠️ No delivery hub within 30km. Delivery may not be available.');
            } else {
                setHubWarning(`✅ Nearest hub: ${nearestHub.name} (${nearestHub.distance}km away)`);
            }
        } catch (error) {
            // Hub check failed, continue anyway
            setHubWarning('');
        }
    };

    // Update location when marker position changes
    useEffect(() => {
        if (markerPosition) {
            reverseGeocode(markerPosition.lat, markerPosition.lng);
            checkHubAvailability(markerPosition.lat, markerPosition.lng);
        }
    }, [markerPosition]);

    // Handle map click
    const handleLocationSelect = (latlng) => {
        setMarkerPosition(latlng);
        setMapCenter(latlng);
    };

    // Handle marker drag
    const handleMarkerDrag = () => {
        const marker = markerRef.current;
        if (marker) {
            const position = marker.getLatLng();
            setMarkerPosition(position);
        }
    };

    // Get current location from browser
    const getCurrentLocation = () => {
        setIsLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setMarkerPosition(newPos);
                    setMapCenter(newPos);
                    setIsLoading(false);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Unable to get your location. Please select manually on the map.');
                    setIsLoading(false);
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
            setIsLoading(false);
        }
    };

    // Handle save
    const handleSave = () => {
        onSave({
            coordinates: markerPosition,
            address: address,
            addressComponents: addressComponents
        });
    };

    return (
        <div className="location-picker-modal">
            <div className="location-picker-content">
                <div className="location-picker-header">
                    <h2>📍 Select Your Delivery Location</h2>
                    <button onClick={onCancel} className="close-btn">✕</button>
                </div>

                <div className="location-picker-actions">
                    <button
                        onClick={getCurrentLocation}
                        className="current-location-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳ Getting location...' : '📍 Use Current Location'}
                    </button>
                </div>

                <div className="location-picker-map-container">
                    <MapContainer
                        center={[mapCenter.lat, mapCenter.lng]}
                        zoom={13}
                        className="location-picker-map"
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        <MapClickHandler onLocationSelect={handleLocationSelect} />

                        {markerPosition && (
                            <Marker
                                position={[markerPosition.lat, markerPosition.lng]}
                                icon={redPinIcon}
                                draggable={true}
                                ref={markerRef}
                                eventHandlers={{
                                    dragend: handleMarkerDrag
                                }}
                            />
                        )}
                    </MapContainer>

                    <div className="map-hint">
                        💡 Click on the map to place pin, or drag the pin to adjust
                    </div>
                </div>

                <div className="location-info">
                    <div className="coordinates">
                        <strong>Selected Location:</strong>
                        <p>Latitude: {markerPosition.lat.toFixed(6)}</p>
                        <p>Longitude: {markerPosition.lng.toFixed(6)}</p>
                    </div>

                    {address && (
                        <div className="address">
                            <strong>Address:</strong>
                            <p>{address}</p>
                        </div>
                    )}

                    {hubWarning && (
                        <div className={`hub-warning ${hubWarning.includes('✅') ? 'success' : 'warning'}`}>
                            {hubWarning}
                        </div>
                    )}
                </div>

                <div className="location-picker-footer">
                    <button onClick={onCancel} className="cancel-btn">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="save-btn">
                        Save Location
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationPicker;
