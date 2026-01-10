import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationPicker from '../../components/client/LocationPicker';
import axios from '../../utils/axios';
import './SetLocation.css';

const SetLocation = () => {
    const navigate = useNavigate();
    const [showLocationPicker, setShowLocationPicker] = useState(true);
    const [savedLocation, setSavedLocation] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('userToken');
            const response = await axios.get('/user/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
            setSavedLocation(response.data.user.deliveryLocation);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleLocationSave = async (location) => {
        try {
            const token = localStorage.getItem('userToken');
            await axios.put('/user/profile', {
                deliveryLocation: location
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSavedLocation(location);
            setShowLocationPicker(false);

            // Show success message and navigate back after 1 second
            setTimeout(() => {
                navigate('/profile');
            }, 1000);
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Failed to save location. Please try again.');
        }
    };

    return (
        <div className="set-location-page">
            <div className="set-location-container">
                <h1>📍 Set Your Delivery Location</h1>
                <p className="subtitle">Select your exact delivery location on the map for accurate deliveries</p>

                {!showLocationPicker && savedLocation ? (
                    <div className="saved-location-card">
                        <h3>✅ Location Saved Successfully!</h3>
                        <div className="location-details">
                            <p><strong>Address:</strong></p>
                            <p>{savedLocation.address}</p>
                            <p><strong>Coordinates:</strong></p>
                            <p>Latitude: {savedLocation.coordinates.lat.toFixed(6)}</p>
                            <p>Longitude: {savedLocation.coordinates.lng.toFixed(6)}</p>
                        </div>
                        <p style={{ color: '#10b981', marginTop: '16px', fontWeight: '600' }}>
                            Redirecting to profile...
                        </p>
                    </div>
                ) : null}

                <div className="instructions">
                    <h3>How to set your location:</h3>
                    <ol>
                        <li>The interactive map will open automatically</li>
                        <li>You have 3 options:
                            <ul>
                                <li>Click "Use Current Location" to auto-detect</li>
                                <li>Click anywhere on the map to place a pin</li>
                                <li>Drag the pin to adjust the exact position</li>
                            </ul>
                        </li>
                        <li>The map will show your address and nearest hub</li>
                        <li>Click "Save Location" to confirm</li>
                    </ol>
                    <button
                        onClick={() => navigate('/profile')}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#64748b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        ← Back to Profile
                    </button>
                </div>
            </div>

            {/* Location Picker Modal */}
            {showLocationPicker && (
                <LocationPicker
                    initialLocation={user?.deliveryLocation?.coordinates}
                    onSave={handleLocationSave}
                    onCancel={() => navigate('/profile')}
                />
            )}
        </div>
    );
};

export default SetLocation;
