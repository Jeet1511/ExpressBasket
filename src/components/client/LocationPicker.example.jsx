// Example: How to integrate LocationPicker in Profile.jsx
// This is a reference implementation showing how to use the LocationPicker component

import React, { useState, useEffect } from 'react';
import LocationPicker from '../../components/client/LocationPicker';
import axios from 'axios';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);

    // Fetch user profile
    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/user/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data.user);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    // Handle location save
    const handleLocationSave = async (location) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/user/profile', {
                deliveryLocation: location
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Refresh user data
            await fetchUserProfile();
            setShowLocationPicker(false);

            alert('Delivery location saved successfully!');
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Failed to save location');
        }
    };

    return (
        <div className="profile-container">
            {/* Other profile sections */}

            {/* Delivery Location Section */}
            <div className="delivery-location-section">
                <h3>📍 Delivery Location</h3>

                {user?.deliveryLocation?.coordinates ? (
                    <div className="location-display">
                        <p><strong>Address:</strong> {user.deliveryLocation.address}</p>
                        <p><strong>Coordinates:</strong> {user.deliveryLocation.coordinates.lat.toFixed(6)}, {user.deliveryLocation.coordinates.lng.toFixed(6)}</p>
                        <button onClick={() => setShowLocationPicker(true)}>
                            Change Location
                        </button>
                    </div>
                ) : (
                    <div className="no-location">
                        <p>No delivery location set</p>
                        <button onClick={() => setShowLocationPicker(true)}>
                            Set Delivery Location
                        </button>
                    </div>
                )}
            </div>

            {/* Location Picker Modal */}
            {showLocationPicker && (
                <LocationPicker
                    initialLocation={user?.deliveryLocation?.coordinates}
                    onSave={handleLocationSave}
                    onCancel={() => setShowLocationPicker(false)}
                />
            )}
        </div>
    );
};

export default Profile;
