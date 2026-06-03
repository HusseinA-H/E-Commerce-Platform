'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Globe, Smartphone, Mail, MapPin } from 'lucide-react';
import { useTranslation } from '../providers/I18nProvider';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { locale, t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  return (
    <footer className="bg-surface-low w-full py-xxl border-t border-outline-variant pb-24 lg:pb-xxl text-start">
      <div className="grid grid-cols-2 md:grid-cols-4 px-6 md:px-margin-desktop max-w-container-max mx-auto gap-x-lg gap-y-xl">
        
        {/* Brand Column */}
        <div className="col-span-2 md:col-span-1 space-y-lg">
          <div className="font-display-lg text-headline-lg text-foreground">APEX LUXE</div>
          <p className="text-on-surface-variant max-w-sm md:max-w-md leading-relaxed text-sm break-normal text-pretty">
            {t('footer.desc')}
          </p>
          <div className="flex gap-lg">
            <Globe className="h-5 w-5 text-foreground hover:text-tertiary cursor-pointer transition-colors" />
            <Smartphone className="h-5 w-5 text-foreground hover:text-tertiary cursor-pointer transition-colors" />
            <Mail className="h-5 w-5 text-foreground hover:text-tertiary cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Shop Column */}
        <div className="space-y-md">
          <p className="font-label-caps text-label-caps text-foreground">{t('footer.shop')}</p>
          <ul className="space-y-sm text-sm">
            <li><Link href={lLink('/shop')} className="text-on-surface-variant hover:text-tertiary transition-colors">{t('nav.shop')}</Link></li>
            <li><Link href={lLink('/shop')} className="text-on-surface-variant hover:text-tertiary transition-colors">{t('footer.outerwear')}</Link></li>
            <li><Link href={lLink('/shop')} className="text-on-surface-variant hover:text-tertiary transition-colors">{t('footer.training')}</Link></li>
            <li><Link href={lLink('/collections/new-arrivals')} className="text-on-surface-variant hover:text-tertiary transition-colors">{t('nav.newArrivals')}</Link></li>
          </ul>
        </div>

        {/* Support Column */}
        <div className="space-y-md">
          <p className="font-label-caps text-label-caps text-foreground">{t('footer.support')}</p>
          <ul className="space-y-sm text-sm">
            <li><Link href={lLink('/wishlist')} className="text-on-surface-variant hover:text-tertiary transition-colors">{t('nav.wishlist')}</Link></li>
            <li><Link href={lLink('/profile')} className="text-on-surface-variant hover:text-tertiary transition-colors">{t('nav.profile')}</Link></li>
            <li><Link href={lLink('/cart')} className="text-on-surface-variant hover:text-tertiary transition-colors">{t('nav.cart')}</Link></li>
            <li><Link href={lLink('/checkout')} className="text-on-surface-variant hover:text-tertiary transition-colors">{t('footer.secureCheckout')}</Link></li>
          </ul>
        </div>

        {/* Headquarters & Map Column */}
        <div className="space-y-md">
          <p className="font-label-caps text-label-caps text-foreground">{t('footer.location')}</p>
          <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">
            {t('footer.hq')}
          </p>
          <div className="w-full h-32 bg-surface-low rounded overflow-hidden relative border border-outline-variant group">
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=8.5300,47.3700,8.5530,47.3830&layer=mapnik&marker=47.3769,8.5417"
              className="w-full h-full transition-all duration-700 grayscale opacity-60 group-hover:scale-105 group-hover:opacity-80"
              style={{ border: 0 }}
              loading="lazy"
              title={t('footer.mapTitle')}
            />
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
              <MapPin className="h-7 w-7 text-tertiary animate-bounce" />
            </div>
          </div>
        </div>

      </div>

      {/* Newsletter signup row */}
      <div className="max-w-container-max mx-auto px-6 md:px-margin-desktop mt-xl pt-lg border-t border-outline-variant">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-xl">
          <div className="flex-1 space-y-sm">
            <h3 className="font-headline-lg text-balance text-lg md:text-xl text-foreground">
              {t('footer.joinCircle')}
            </h3>
            <p className="text-on-surface-variant text-sm leading-relaxed text-pretty">
              {t('footer.earlyReleases')}
            </p>
          </div>
          <div className="flex-1 w-full">
            {subscribed ? (
              <div className="p-4 bg-tertiary/10 border border-tertiary/20 rounded text-tertiary font-label-caps text-center">
                {t('footer.subscribed')}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-xs w-full">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-surface border border-outline-variant px-lg py-3 font-label-caps text-label-caps focus:border-tertiary focus:ring-0 outline-none text-foreground rounded" 
                  placeholder={t('footer.emailPlaceholder')} 
                  required
                />
                <button 
                  type="submit" 
                  className="bg-tertiary text-on-tertiary px-xl py-3 font-button text-button hover:opacity-90 transition-opacity active:scale-95 rounded whitespace-nowrap"
                >
                  {t('footer.subscribe')}
                </button>
              </form>
            )}
            <p className="text-[10px] text-on-surface-variant/40 mt-sm tracking-wider">
              {t('footer.terms')}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-xl pt-lg border-t border-outline-variant px-6 md:px-margin-desktop max-w-container-max mx-auto">
        <p className="text-on-surface-variant/50 text-center text-[10px]">
          {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
}
