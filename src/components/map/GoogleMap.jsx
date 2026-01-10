import React, { useEffect, useRef, useState } from 'react';
import { Wrapper } from '@googlemaps/react-wrapper';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Base Google Map Component
const GoogleMapComponent = ({
    center = { lat: 20.5937, lng: 78.9629 },
    zoom = 5,
    onMapLoad,
    children,
    style = { width: '100%', height: '100%' }
}) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);

    useEffect(() => {
        if (mapRef.current && !map) {
            const newMap = new window.google.maps.Map(mapRef.current, {
                center,
                zoom,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
            });
            setMap(newMap);
            if (onMapLoad) onMapLoad(newMap);
        }
    }, [mapRef, map, center, zoom, onMapLoad]);

    return (
        <>
            <div ref={mapRef} style={style} />
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { map });
                }
                return child;
            })}
        </>
    );
};

// Wrapper component with API key
const GoogleMap = (props) => {
    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                background: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '8px',
                margin: '20px'
            }}>
                <h3>⚠️ Google Maps API Key Required</h3>
                <p>Please add your Google Maps API key to the <code>.env</code> file:</p>
                <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                    VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
                </pre>
                <p>Get a free key at: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></p>
            </div>
        );
    }

    return (
        <Wrapper apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geometry']}>
            <GoogleMapComponent {...props} />
        </Wrapper>
    );
};

export default GoogleMap;
