import { messaging, isConfigured } from './firebase';
import { getToken } from 'firebase/messaging';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function requestNotificationPermission(userId?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return null;
  }

  if (!isConfigured || !messaging) {
    console.warn('Firebase is not configured. Simulating permission request.');
    const perm = await Notification.requestPermission();
    return perm === 'granted' ? 'mock-fcm-token-12345' : null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });

      if (token) {
        await registerTokenWithBackend(token, userId);
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

export async function registerTokenWithBackend(token: string, userId?: string) {
  try {
    const tokenPayload = {
      token,
      deviceType: getDeviceType(),
      userId,
    };
    const authDataStr = localStorage.getItem('auth-storage');
    let headers = {};
    if (authDataStr) {
      try {
        const authData = JSON.parse(authDataStr);
        const accessToken = authData.state?.token;
        if (accessToken) {
          headers = { Authorization: `Bearer ${accessToken}` };
        }
      } catch (e) {
        // ignore
      }
    }

    await axios.post(`${API_URL}/notifications/push/register`, tokenPayload, { headers });
    localStorage.setItem('fcm_token', token);
    console.log('FCM token successfully registered with backend.');
  } catch (error) {
    console.error('Failed to register FCM token with backend:', error);
  }
}

function getDeviceType(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  if (ua.includes('android')) return 'android';
  return 'web';
}
