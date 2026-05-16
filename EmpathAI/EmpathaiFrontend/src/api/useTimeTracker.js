import { useEffect, useRef, useCallback } from 'react';

async function sendTimeSpent(userId, seconds) {
    if (!userId || seconds <= 0) return;
    try {
        const token = localStorage.getItem('access_token') || '';
        await fetch('/api/users/' + userId + '/time-spent', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: 'Bearer ' + token }),
            },
            body: JSON.stringify({ seconds }),
            keepalive: true,
        });
    } catch (err) {
        console.warn('Time-spent sync failed:', err);
    }
}

export default function useTimeTracker(userId) {
    const lastSyncRef = useRef(Date.now());
    const intervalRef = useRef(null);
    const userIdRef = useRef(userId);

    // Keep userIdRef in sync without re-running the effect
    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    const flush = useCallback(async () => {
        const currentUserId = userIdRef.current;
        if (!currentUserId) return;

        const now = Date.now();
        const secondsSinceLastSync = Math.floor((now - lastSyncRef.current) / 1000);

        if (secondsSinceLastSync > 0) {
            lastSyncRef.current = now;
            await sendTimeSpent(currentUserId, secondsSinceLastSync);
        }
    }, [])  // No dependencies — uses refs only

    useEffect(() => {
        if (!userId) {
            // Clear interval if user logs out
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return;
        }

        // Only start if not already running
        if (intervalRef.current) return;

        lastSyncRef.current = Date.now();
        intervalRef.current = setInterval(flush, 60000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') flush();
        };
        const handlePageHide = () => flush();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            flush();
        };
    }, [userId, flush]);
}