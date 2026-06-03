'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Truck, Coins, Settings, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../providers/I18nProvider';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, t } = useTranslation();

  const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';

  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  const navItems = [
    { label: t('vendor.dashboard'), path: '/vendor', icon: LayoutDashboard },
    { label: t('vendor.products'), path: '/vendor/products', icon: ShoppingBag },
    { label: t('vendor.orders'), path: '/vendor/orders', icon: Truck },
    { label: t('vendor.payouts'), path: '/vendor/payouts', icon: Coins },
    { label: t('vendor.settings'), path: '/vendor/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-e border-outline-variant flex flex-col justify-between shrink-0 text-start">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <Link href={lLink('/')} className="font-display-lg text-lg text-white font-black hover:text-tertiary transition-colors flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> APEX SHOP
            </Link>
            <span className="bg-tertiary/10 border border-tertiary/20 text-tertiary text-[9px] font-bold font-label-caps px-2 py-0.5 rounded">
              VENDOR
            </span>
          </div>

          <nav className="space-y-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = cleanPath === item.path;
              return (
                <Link
                  key={item.path}
                  href={lLink(item.path)}
                  className={`flex items-center gap-md px-4 py-3 rounded-lg text-sm transition-all font-semibold ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-outline-variant text-[10px] text-on-surface-variant/50">
          © 2026 APEX VENDOR LABS
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-background/50">
        <header className="h-16 border-b border-outline-variant flex items-center justify-end px-6 md:px-8">
          <span className="text-xs text-on-surface-variant">
            {t('vendor.verifiedAccess')}
          </span>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
