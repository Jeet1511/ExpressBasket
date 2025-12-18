import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';

export const useMailNotification = () => {
    const [lastCount, setLastCount] = useState(0);
    const isFirstCheck = useRef(true);

    useEffect(() => {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const checkMails = async () => {
            try {
                const response = await axios.get('/user/mails', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const newUnreadCount = response.data.unreadCount || 0;

                // Only show notification if there are new mails (not on first load)
                if (!isFirstCheck.current && newUnreadCount > lastCount) {
                    const newMails = newUnreadCount - lastCount;
                    return { hasNew: true, count: newMails };
                }

                isFirstCheck.current = false;
                setLastCount(newUnreadCount);
                return { hasNew: false, count: 0 };
            } catch (error) {
                console.error('Error checking mails:', error);
                return { hasNew: false, count: 0 };
            }
        };

        // Initial check
        checkMails();

        // Poll every 30 seconds
        const interval = setInterval(async () => {
            const result = await checkMails();
            if (result.hasNew && window.showMailNotification) {
                window.showMailNotification(result.count);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [lastCount]);

    return { lastCount };
};

export default useMailNotification;
