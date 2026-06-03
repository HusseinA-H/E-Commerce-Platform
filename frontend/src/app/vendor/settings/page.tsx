'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Settings, 
  Store, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Image as ImageIcon, 
  CheckCircle2 
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { useTranslation } from '../../../providers/I18nProvider';

export default function VendorSettings() {
  const { locale, t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiClient.get('/vendor/settings');
      const { storeName: name, profile } = res.data;
      setStoreName(name || '');
      if (profile) {
        setDescription(profile.description || '');
        setSupportEmail(profile.supportEmail || '');
        setSupportPhone(profile.supportPhone || '');
        setWebsite(profile.website || '');
        setLogoUrl(profile.logoUrl || '');
        setBannerUrl(profile.bannerUrl || '');
        setAddress(profile.address || '');
        setCity(profile.city || '');
        setCountry(profile.country || '');
      }
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      storeName,
      description: description || null,
      supportEmail: supportEmail || null,
      supportPhone: supportPhone || null,
      website: website || null,
      logoUrl: logoUrl || null,
      bannerUrl: bannerUrl || null,
      address: address || null,
      city: city || null,
      country: country || null
    };

    try {
      const res = await apiClient.patch('/vendor/settings', payload);
      setSuccessMsg(t('vendor.settingsUpdated'));
      
      // Update form values with response just in case
      const { storeName: name, profile } = res.data;
      setStoreName(name || '');
      if (profile) {
        setDescription(profile.description || '');
        setSupportEmail(profile.supportEmail || '');
        setSupportPhone(profile.supportPhone || '');
        setWebsite(profile.website || '');
        setLogoUrl(profile.logoUrl || '');
        setBannerUrl(profile.bannerUrl || '');
        setAddress(profile.address || '');
        setCity(profile.city || '');
        setCountry(profile.country || '');
      }
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-md">
        <Loader2 className="h-8 w-8 text-tertiary animate-spin" />
        <span className="text-sm text-on-surface-variant font-semibold">
          {t('vendor.loadingSettings')}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-xl text-start font-sans">
      {/* Title */}
      <div className="border-b border-outline-variant pb-md">
        <h1 className="font-display-lg text-2xl text-white uppercase font-black">
          {t('vendor.settings')}
        </h1>
        <p className="text-on-surface-variant text-xs mt-xs">
          {t('vendor.settingsDesc')}
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded flex items-center gap-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-lg">
        {/* Section 1: Store profile branding */}
        <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-md">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-xs">
            <Store className="h-4 w-4 text-tertiary" />
            {t('vendor.storeProfile')}
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('vendor.storeProfileDesc')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-sm">
            <div className="space-y-xs">
              <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.storeNameLabel')}</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
              />
            </div>
            
            <div className="space-y-xs">
              <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.websiteUrl')}</label>
              <div className="relative">
                <Globe className="absolute start-3 top-3 h-4 w-4 text-on-surface-variant/50" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://apexatelier.com"
                  className="w-full bg-background border border-outline-variant ps-10 pe-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-xs pt-xs">
            <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.storeDesc')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('vendor.storeDescPlaceholder')}
              className="w-full h-24 bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none resize-none"
            />
          </div>
        </div>

        {/* Section 2: Contact Info */}
        <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-md">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-xs">
            <Mail className="h-4 w-4 text-tertiary" />
            {t('vendor.supportContact')}
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('vendor.supportContactDesc')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-sm">
            <div className="space-y-xs">
              <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.supportEmail')}</label>
              <div className="relative">
                <Mail className="absolute start-3 top-3 h-4 w-4 text-on-surface-variant/50" />
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  required
                  placeholder="support@apexbrand.com"
                  className="w-full bg-background border border-outline-variant ps-10 pe-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.supportPhone')}</label>
              <div className="relative">
                <Phone className="absolute start-3 top-3 h-4 w-4 text-on-surface-variant/50" />
                <input
                  type="tel"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full bg-background border border-outline-variant ps-10 pe-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Visual Assets */}
        <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-md">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-xs">
            <ImageIcon className="h-4 w-4 text-tertiary" />
            {t('vendor.brandVisuals')}
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('vendor.brandVisualsDesc')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-sm">
            <div className="space-y-xs">
              <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.logoUrl')}</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://mycdn.com/logo.jpg"
                className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
              />
              {logoUrl && (
                <div className="w-12 h-12 rounded-lg border border-outline-variant overflow-hidden mt-xs">
                  <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            <div className="space-y-xs">
              <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.bannerUrl')}</label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://mycdn.com/banner.jpg"
                className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
              />
              {bannerUrl && (
                <div className="w-full h-12 rounded-lg border border-outline-variant overflow-hidden mt-xs">
                  <img src={bannerUrl} alt="Banner preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Physical Address */}
        <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-md">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-xs">
            <MapPin className="h-4 w-4 text-tertiary" />
            {t('vendor.businessLocation')}
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('vendor.businessLocationDesc')}
          </p>

          <div className="space-y-xs pt-sm">
            <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.streetAddress')}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 5th Avenue Suite 300"
              className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-xs">
            <div className="space-y-xs">
              <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.city')}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. New York"
                className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
              />
            </div>

            <div className="space-y-xs">
              <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.country')}</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States"
                className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit row */}
        <div className="flex justify-end pt-md">
          <button
            type="submit"
            disabled={saving}
            className="bg-white text-black hover:bg-tertiary hover:text-black font-button text-xs uppercase px-8 py-3.5 rounded font-bold transition-all flex items-center justify-center gap-xs"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t('vendor.saveSettings')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
