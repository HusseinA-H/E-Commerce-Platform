'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem('pwa_install_dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (dismissed || isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    try {
      await axios.post(`${API_URL}/mobile-analytics/event`, {
        eventType: outcome === 'accepted' ? 'pwa_install' : 'push_dismiss',
        deviceType: 'web',
        metadata: { outcome },
      });
    } catch (e) {
      // ignore
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-secondary border border-border p-4 shadow-2xl flex items-center justify-between rounded-none backdrop-blur-md bg-opacity-95">
      <div className="flex flex-col mr-4">
        <span className="text-xs font-bold tracking-widest text-tertiary">APEX LUXE APP</span>
        <span className="text-sm text-muted-foreground mt-1 font-geist">Install for offline access and faster experience.</span>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground uppercase tracking-wider hover:text-on-background px-2 py-1 transition-colors"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="bg-tertiary text-on-tertiary text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-opacity-95 transition-all shadow-md active:scale-95"
        >
          Install
        </button>
      </div>
    </div>
  );
}
