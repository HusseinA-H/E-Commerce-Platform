'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store';
import { requestNotificationPermission } from '../lib/push-notifications';
import { isConfigured, messaging } from '../lib/firebase';
import { onMessage } from 'firebase/messaging';

export default function PushNotificationInit() {
  const currentUser = useAuthStore((state) => state.currentUser);

  useEffect(() => {
    if (!currentUser) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        requestNotificationPermission(currentUser.id);
      }
    }

    if (isConfigured && messaging) {
      try {
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log('Received foreground message:', payload);
          if (Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'APEX LUXE', {
              body: payload.notification?.body,
              icon: '/icons/icon-192x192.png',
            });
          }
        });
        return () => unsubscribe();
      } catch (err) {
        console.error('Error setting up onMessage listener:', err);
      }
    }
  }, [currentUser]);

  return null;
}
