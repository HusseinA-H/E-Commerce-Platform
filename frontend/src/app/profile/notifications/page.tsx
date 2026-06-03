'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, CheckCircle, BellRing } from 'lucide-react';
import { useAuthStore } from '../../../store';
import { apiClient } from '../../../lib/api-client';
import { requestNotificationPermission } from '../../../lib/push-notifications';
import { useTranslation } from '../../../providers/I18nProvider';

const NOTIFICATION_TYPES = [
  { key: 'order_updates' },
  { key: 'wishlist_alerts' },
  { key: 'loyalty_alerts' },
  { key: 'promotions' },
  { key: 'ai_recommendations' },
];

const CHANNELS = [
  { key: 'in_app' },
  { key: 'email' },
  { key: 'push' },
];

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { locale, t } = useTranslation();
  
  const [preferences, setPreferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    async function fetchPrefs() {
      try {
        const response = await apiClient.get('/notifications/preferences');
        setPreferences(response.data);
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPrefs();
  }, [currentUser, router]);

  const togglePreference = async (channel: string, type: string) => {
    const current = preferences.find(p => p.channel === channel && p.type === type);
    const nextValue = current ? !current.isEnabled : false;

    if (channel === 'push' && nextValue) {
      const token = await requestNotificationPermission(currentUser?.id);
      if (!token) {
        alert(t('notificationsSettings.grantPermissionAlert'));
        return;
      }
    }

    const updated = preferences.map(p => {
      if (p.channel === channel && p.type === type) {
        return { ...p, isEnabled: nextValue };
      }
      return p;
    });

    const exists = preferences.some(p => p.channel === channel && p.type === type);
    if (!exists) {
      updated.push({ channel, type, isEnabled: nextValue });
    }

    setPreferences(updated);
    setSaving(true);

    try {
      await apiClient.put('/notifications/preferences', {
        channel,
        type,
        isEnabled: nextValue,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update preference:', err);
    } finally {
      setSaving(false);
    }
  };

  const getPreferenceState = (channel: string, type: string): boolean => {
    const pref = preferences.find(p => p.channel === channel && p.type === type);
    return pref ? pref.isEnabled : true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-tertiary" />
      </div>
    );
  }

  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-24 font-sans text-start">
      <main className="max-w-3xl mx-auto px-6 pt-12 space-y-8">
        
        <Link href={lLink('/profile')} className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4" /> {t('notificationsSettings.backToProfile')}
        </Link>

        <div className="flex justify-between items-center border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide font-display text-white">{t('notificationsSettings.title')}</h1>
            <p className="text-white/40 text-xs mt-1">{t('notificationsSettings.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-[10px] font-mono tracking-wider text-tertiary flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {t('notificationsSettings.autoSaved')}
              </span>
            )}
            {saving && <Loader2 className="h-4 w-4 animate-spin text-tertiary" />}
          </div>
        </div>

        <div className="space-y-6">
          {NOTIFICATION_TYPES.map((typeSpec) => (
            <div key={typeSpec.key} className="p-6 bg-white/2 border border-white/5 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-1 md:pr-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {t('notificationsSettings.' + typeSpec.key)}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed font-geist">
                  {t('notificationsSettings.' + typeSpec.key + '_desc')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {CHANNELS.map((channelSpec) => {
                  const isChecked = getPreferenceState(channelSpec.key, typeSpec.key);
                  return (
                    <button
                      key={channelSpec.key}
                      onClick={() => togglePreference(channelSpec.key, typeSpec.key)}
                      className={`px-4 py-2 border transition-all text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 ${
                        isChecked
                          ? 'bg-white text-black border-white'
                          : 'border-white/10 text-white/40 hover:border-white/20'
                      }`}
                    >
                      {t('notificationsSettings.' + channelSpec.key)}
                      <span className={`w-1.5 h-1.5 rounded-full ${isChecked ? 'bg-tertiary' : 'bg-transparent border border-white/20'}`}></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border border-white/5 bg-white/1 flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <BellRing className="w-6 h-6 text-tertiary shrink-0 animate-bounce" />
            <div>
              <h4 className="text-xs font-bold uppercase text-white tracking-widest">{t('notificationsSettings.testPush')}</h4>
              <p className="text-[10px] text-white/40 mt-0.5 font-geist">{t('notificationsSettings.testPushDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => requestNotificationPermission(currentUser?.id)}
            className="px-4 py-2.5 bg-transparent hover:bg-white hover:text-black border border-white/10 text-white text-[10px] font-mono tracking-wider transition-all"
          >
            {t('notificationsSettings.activatePush')}
          </button>
        </div>

      </main>
    </div>
  );
}
