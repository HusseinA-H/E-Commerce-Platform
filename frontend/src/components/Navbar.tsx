'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useUIStore } from '../store';
import { useCart } from '../hooks/useCart';
import { useWishlistQuery } from '../hooks/useWishlist';
import { useHydrated } from '../hooks/useHydrated';
import { useTranslation } from '../providers/I18nProvider';
import { useTheme } from '../providers/ThemeProvider';
import { useCurrency, CurrencyCode } from '../providers/CurrencyProvider';
import { Sparkles, Search, Heart, User, ShoppingBag, Home, Globe, Sun, Moon, Bell, X, Check } from 'lucide-react';
import { useUnreadCount, useNotifications, useMarkAllAsRead, useMarkAsRead, getNotificationConfig } from '../hooks/useNotifications';

export default function Navbar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { items: cartItems } = useCart();
  const { data: wishlistItems = [] } = useWishlistQuery();
  const storeCurrentUser = useAuthStore((state) => state.currentUser);
  const currentUser = hydrated ? storeCurrentUser : null;
  const openAISearch = useUIStore((state) => state.openAISearch);
  const openAIStylist = useUIStore((state) => state.openAIStylist);

  const { locale, t, changeLocale } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  const cartCount = hydrated ? cartItems.reduce((acc, item) => acc + item.quantity, 0) : 0;
  const wishlistCount = hydrated ? wishlistItems.length : 0;
  const [notifOpen, setNotifOpen] = React.useState(false);
  const { data: unreadData } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllAsRead();
  const markRead = useMarkAsRead();
  const unreadCount = unreadData?.count ?? 0;

  const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';
  const isAdminPath = cleanPath.startsWith('/admin');

  // Helper to build localized links
  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  return (
    <>
      <nav className="fixed top-0 w-full h-16 md:h-20 bg-background/80 backdrop-blur-xl border-b border-outline-variant flex justify-between items-center px-4 md:px-margin-desktop z-50">
        <Link href={lLink('/')} className="font-display-lg text-headline-lg tracking-tighter text-on-background hover:text-tertiary transition-colors">
          APEX LUXE
        </Link>

        {!isAdminPath && (
          <div className="hidden lg:flex items-center gap-xl font-label-caps text-label-caps">
            <Link 
              href={lLink('/shop')} 
              className={`whitespace-nowrap hover:text-tertiary transition-colors duration-300 ${cleanPath === '/shop' ? 'text-tertiary border-b-2 border-tertiary pb-1' : 'text-on-surface-variant'}`}
            >
              {t('nav.shop')}
            </Link>
            <Link 
              href={lLink('/collections/new-arrivals')} 
              className={`whitespace-nowrap hover:text-tertiary transition-colors duration-300 ${cleanPath === '/collections/new-arrivals' ? 'text-tertiary border-b-2 border-tertiary pb-1' : 'text-on-surface-variant'}`}
            >
              {t('nav.newArrivals')}
            </Link>
            <Link 
              href={lLink('/collections/performance')} 
              className={`whitespace-nowrap hover:text-tertiary transition-colors duration-300 ${cleanPath === '/collections/performance' ? 'text-tertiary border-b-2 border-tertiary pb-1' : 'text-on-surface-variant'}`}
            >
              {t('nav.performance')}
            </Link>
            <button 
              onClick={openAIStylist}
              className="text-on-surface-variant hover:text-tertiary flex items-center gap-1 transition-colors duration-300 font-label-caps"
            >
              <Sparkles className="h-4 w-4 text-tertiary animate-pulse" />
              {t('assistant.concierge')}
            </button>
            {currentUser && ['admin', 'super_admin', 'inventory_manager', 'support_agent'].includes(currentUser.role) && (
              <Link 
                href={lLink('/admin')} 
                className="text-tertiary hover:underline transition-all font-label-caps"
              >
                Admin Panel
              </Link>
            )}
          </div>
        )}

        {isAdminPath && (
          <div className="hidden lg:flex items-center gap-xl font-label-caps text-label-caps text-tertiary">
            <span>ADMINISTRATOR ACCESS</span>
            <Link href={lLink('/')} className="text-on-surface-variant hover:text-white transition-all">
              Go To Shop
            </Link>
          </div>
        )}

        <div className="flex items-center gap-lg">
          {/* Language Switcher */}
          <button
            onClick={() => changeLocale(locale === 'en' ? 'ar' : 'en')}
            className="text-on-background hover:text-tertiary transition-colors font-label-caps text-xs flex items-center gap-1"
            title={locale === 'en' ? 'Switch to Arabic' : 'التغيير إلى الإنجليزية'}
          >
            <Globe className="h-5 w-5" />
            <span className="hidden md:inline font-bold">{locale === 'en' ? 'AR' : 'EN'}</span>
          </button>

          {/* Currency Switcher */}
          <div className="relative flex items-center gap-1">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="bg-transparent text-on-background hover:text-tertiary transition-colors font-label-caps text-xs font-bold border-none cursor-pointer focus:outline-none appearance-none pr-3.5"
              style={{
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
                backgroundSize: '10px',
              }}
              title="Switch Currency"
            >
              <option value="USD" className="bg-surface text-foreground">USD ($)</option>
              <option value="EUR" className="bg-surface text-foreground">EUR (€)</option>
              <option value="GBP" className="bg-surface text-foreground">GBP (£)</option>
              <option value="AED" className="bg-surface text-foreground">AED</option>
              <option value="SAR" className="bg-surface text-foreground">SAR</option>
              <option value="EGP" className="bg-surface text-foreground">EGP</option>
            </select>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="text-on-background hover:text-tertiary transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          {/* AI Search Icon */}
          <button 
            onClick={openAISearch} 
            className="text-on-background hover:text-tertiary transition-colors"
            title="AI Search"
          >
            <Search className="h-6 w-6" />
          </button>

          {/* Notification Bell */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative text-on-background hover:text-tertiary transition-colors"
                title="Notifications"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-tertiary text-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-10 w-80 bg-surface border border-outline-variant rounded-xl shadow-2xl z-[200] overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                    <span className="text-[10px] font-mono text-on-surface-variant/60 tracking-widest uppercase">Notifications</span>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllRead.mutate()}
                          className="text-[9px] font-mono text-tertiary hover:text-tertiary/70 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)}>
                        <X className="h-4 w-4 text-on-surface-variant/40 hover:text-on-surface transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Notification list */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-on-surface-variant/40 text-xs">No notifications</div>
                    ) : (
                      notifications.slice(0, 8).map((notif) => {
                        const cfg = getNotificationConfig(notif.type);
                        return (
                          <div
                            key={notif.id}
                            className={`px-4 py-3 border-b border-outline-variant cursor-pointer hover:bg-foreground/5 transition-colors flex gap-3 ${notif.isRead ? 'opacity-50' : ''}`}
                            onClick={() => { if (!notif.isRead) markRead.mutate(notif.id); }}
                          >
                            <span className="text-base shrink-0 pt-0.5">{cfg.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-foreground truncate">{notif.title}</p>
                              <p className="text-[10px] text-on-surface-variant/70 leading-relaxed line-clamp-2 mt-0.5">{notif.message}</p>
                              <p className="text-[9px] text-on-surface-variant/40 font-mono mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                            </div>
                            {!notif.isRead && <div className="w-1.5 h-1.5 bg-tertiary rounded-full shrink-0 mt-1.5" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Wishlist Link */}
          <Link href={lLink('/wishlist')} className="relative group" title="Wishlist">
            <Heart className={`h-6 w-6 hover:text-tertiary transition-colors ${cleanPath === '/wishlist' ? 'text-tertiary' : 'text-on-background'}`} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-foreground text-background text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Profile Link */}
          <Link href={currentUser && ['admin', 'super_admin', 'inventory_manager', 'support_agent'].includes(currentUser.role) ? lLink('/admin') : lLink('/profile')} className="group" title="Profile">
            <User className={`h-6 w-6 hover:text-tertiary transition-colors ${cleanPath === '/profile' || cleanPath.startsWith('/admin') ? 'text-tertiary' : 'text-on-background'}`} />
          </Link>

          {/* Cart Icon */}
          <Link href={lLink('/cart')} className="relative active:scale-95 transition-transform" title="Shopping Cart">
            <ShoppingBag className={`h-6 w-6 hover:text-tertiary transition-colors ${cleanPath === '/cart' ? 'text-tertiary' : 'text-on-background'}`} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-tertiary text-on-tertiary text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (Visible on smaller viewports) */}
      <nav className="fixed bottom-0 left-0 w-full h-16 z-40 lg:hidden bg-surface-low/95 backdrop-blur-md border-t border-outline-variant shadow-2xl flex justify-around items-center py-2 px-margin-mobile">
        <Link 
          href={lLink('/')} 
          className={`flex flex-col items-center active:scale-90 transition-transform ${cleanPath === '/' ? 'text-tertiary' : 'text-on-surface-variant/80'}`}
        >
          <Home className="h-[22px] w-[22px]" />
          <span className="font-label-caps text-[9px] uppercase tracking-normal mt-0.5">{t('nav.home')}</span>
        </Link>
        <Link 
          href={lLink('/shop')} 
          className={`flex flex-col items-center active:scale-90 transition-transform ${cleanPath === '/shop' ? 'text-tertiary' : 'text-on-surface-variant/80'}`}
        >
          <ShoppingBag className="h-[22px] w-[22px]" />
          <span className="font-label-caps text-[9px] uppercase tracking-normal mt-0.5">{t('nav.shop')}</span>
        </Link>
        <button 
          onClick={openAIStylist}
          className="flex flex-col items-center active:scale-90 transition-transform text-on-surface-variant/80 hover:text-tertiary"
        >
          <Sparkles className="h-[22px] w-[22px] text-tertiary" />
          <span className="font-label-caps text-[9px] uppercase tracking-normal mt-0.5">Stylist</span>
        </button>
        <Link 
          href={currentUser && ['admin', 'super_admin', 'inventory_manager', 'support_agent'].includes(currentUser.role) ? lLink('/admin') : lLink('/profile')}
          className={`flex flex-col items-center active:scale-90 transition-transform ${cleanPath === '/profile' || cleanPath.startsWith('/admin') ? 'text-tertiary' : 'text-on-surface-variant/80'}`}
        >
          <User className="h-[22px] w-[22px]" />
          <span className="font-label-caps text-[9px] uppercase tracking-normal mt-0.5">{t('nav.profile')}</span>
        </Link>
      </nav>
    </>
  );
}
