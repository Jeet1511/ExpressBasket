import React, { useState, useEffect } from 'react';
import GoogleMap from './GoogleMap';
import './HubSelectionMap.css';

const HubSelectionMap = ({ onHubSelect, initialHub = null }) => {
    const [selectedHub, setSelectedHub] = useState(initialHub);
    const [marker, setMarker] = useState(null);
    const [map, setMap] = useState(null);

    const handleMapLoad = (loadedMap) => {
        setMap(loadedMap);

        // Add click listener to map
        loadedMap.addListener('click', (e) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();

            // Remove old marker
            if (marker) {
                marker.setMap(null);
            }

            // Create new marker
            const newMarker = new window.google.maps.Marker({
                position: { lat, lng },
                map: loadedMap,
                title: 'Hub Location',
                icon: {
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }
            });

            setMarker(newMarker);

            // Reverse geocode to get address
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const address = results[0].formatted_address;
                    setSelectedHub({ lat, lng, address });

                    if (onHubSelect) {
                        onHubSelect({ lat, lng, address });
                    }
                }
            });
        });

        // If initial hub exists, show marker
        if (initialHub) {
            const initialMarker = new window.google.maps.Marker({
                position: { lat: initialHub.lat, lng: initialHub.lng },
                map: loadedMap,
                title: 'Hub Location',
                icon: {
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }
            });
            setMarker(initialMarker);
            loadedMap.setCenter({ lat: initialHub.lat, lng: initialHub.lng });
            loadedMap.setZoom(12);
        }
    };

    return (
        <div className="hub-selection-container">
            <div className="hub-selection-header">
                <h3>📍 Select Hub Location</h3>
                <p>Click anywhere on the map to set the hub location</p>
            </div>

            <div className="hub-map-wrapper" style={{ height: '500px', borderRadius: '12px', overflow: 'hidden' }}>
                <GoogleMap
                    center={initialHub || { lat: 20.5937, lng: 78.9629 }}
                    zoom={initialHub ? 12 : 5}
                    onMapLoad={handleMapLoad}
                />
            </div>

            {selectedHub && (
                <div className="hub-info-card">
                    <h4>Selected Hub Location</h4>
                    <p><strong>Address:</strong> {selectedHub.address}</p>
                    <p><strong>Coordinates:</strong> {selectedHub.lat.toFixed(6)}, {selectedHub.lng.toFixed(6)}</p>
                </div>
            )}
        </div>
    );
};

export default HubSelectionMap;
