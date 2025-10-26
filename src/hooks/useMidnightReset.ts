import { useEffect } from 'react';

/**
 * Hook that calls a refresh function at midnight (12am) every day
 * to reset daily displays while keeping data intact
 */
export const useMidnightReset = (onMidnight: () => void) => {
  useEffect(() => {
    const scheduleNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Set to midnight
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        onMidnight();
        // Schedule the next midnight after triggering
        scheduleNextMidnight();
      }, timeUntilMidnight);
    };
    
    const timeoutId = scheduleNextMidnight();
    
    return () => clearTimeout(timeoutId);
  }, [onMidnight]);
};
