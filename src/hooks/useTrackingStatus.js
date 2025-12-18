import { useState, useEffect } from 'react';
import axios from '../utils/axios.js';

export const useTrackingStatus = () => {
    const [trackingEnabled, setTrackingEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrackingStatus();
    }, []);

    const fetchTrackingStatus = async () => {
        try {
            const response = await axios.get('/settings/tracking');
            setTrackingEnabled(response.data.trackingEnabled);
        } catch (error) {
            console.error('Error fetching tracking status:', error);
            setTrackingEnabled(false);
        } finally {
            setLoading(false);
        }
    };

    return { trackingEnabled, loading };
};

export default useTrackingStatus;
