import { useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function useMobileAnalytics() {
  const currentUser = useAuthStore((state) => state.currentUser);

  const getDeviceType = (): 'ios' | 'android' | 'web' => {
    if (typeof window === 'undefined') return 'web';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    if (ua.includes('android')) return 'android';
    return 'web';
  };

  const logEvent = useCallback(async (eventType: string, metadata?: Record<string, any>) => {
    try {
      const payload = {
        eventType,
        deviceType: getDeviceType(),
        metadata,
        userId: currentUser?.id || null,
      };

      await axios.post(`${API_URL}/mobile-analytics/event`, payload);
      console.log(`[Mobile Analytics] Event logged: ${eventType}`, payload);
    } catch (error) {
      console.warn(`[Mobile Analytics] Failed to log event: ${error}`);
    }
  }, [currentUser]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      logEvent('pwa_open', { referrer: document.referrer });
    }
  }, [logEvent]);

  return { logEvent, deviceType: getDeviceType() };
}
