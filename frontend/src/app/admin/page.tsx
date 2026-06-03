'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminSummaryQuery, useAdminActivityFeedQuery } from '../../hooks/useAdmin';
import { CreditCard, Truck, Users, Package, Lock, Activity, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../providers/I18nProvider';
import { useCurrency } from '../../providers/CurrencyProvider';

export default function AdminOverviewPage() {
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { data: summaryData, isLoading } = useAdminSummaryQuery();
  const { data: activityFeed = [], isLoading: isLoadingFeed, refetch: refetchFeed } = useAdminActivityFeedQuery();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered':
        return t('tracking.delivered');
      case 'shipped':
        return t('tracking.shipped');
      default:
        return t('vendor.pending');
    }
  };

  const getActivityTypeLabel = (type: string) => {
    if (type === 'new_order') return t('admin.newOrder') || 'NEW ORDER';
    if (type === 'refund') return t('admin.refund') || 'REFUND';
    return type.replace('_', ' ').toUpperCase();
  };

  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  if (isLoading || isLoadingFeed || !summaryData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <div className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-label-caps text-xs">{t('admin.loadingTelemetry')}</p>
      </div>
    );
  }

  const { metrics, recentOrders } = summaryData;

  const stats = [
    { label: t('admin.totalRevenue'), value: formatPrice(metrics.totalRevenue), icon: CreditCard, trend: t('admin.accumulatedSales'), color: 'text-tertiary' },
    { label: t('admin.activeOrders'), value: (metrics.pendingOrdersCount + metrics.processingOrdersCount).toString(), icon: Truck, trend: t('admin.logisticalTransit'), color: 'text-blue-400' },
    { label: t('admin.activeAccounts'), value: metrics.totalUsers.toString(), icon: Users, trend: t('admin.registeredCustomers'), color: 'text-white' },
    { label: t('admin.productSkus'), value: metrics.totalProducts.toString(), icon: Package, trend: t('admin.activeProducts'), color: 'text-purple-400' }
  ];

  return (
    <div className="space-y-xl">
      
      {/* 1. Header Page Title */}
      <div>
        <h1 className="font-display-lg text-balance text-3xl md:text-5xl text-white uppercase tracking-tight">{t('admin.overview')}</h1>
        <p className="text-on-surface-variant text-sm leading-relaxed text-pretty mt-sm">
          {t('admin.welcomeBack')}
        </p>
      </div>

      {/* 2. Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
          <div key={idx} className="luxury-glass p-6 rounded-xl border border-white/5 space-y-md">
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-[10px] text-on-surface-variant/60">{stat.label}</span>
              <Icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div className="space-y-xs">
              <h2 className="text-white text-2xl md:text-3xl font-display-lg">{stat.value}</h2>
              <p className="text-[10px] font-label-caps text-on-surface-variant/40 tracking-wider font-normal">
                {stat.trend}
              </p>
            </div>
          </div>
        );
        })}
      </section>

      {/* 3. Sales Curve & Recent activity split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        
        {/* Sales Curve Graph (Left: 8 cols) */}
        <div className="lg:col-span-8 luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-headline-lg text-lg text-white uppercase">{t('admin.salesCurve')}</h3>
              <p className="text-[11px] text-on-surface-variant/40 font-sans normal-case mt-0.5">{t('admin.monthOnMonth')}</p>
            </div>
            <span className="text-[11px] font-label-caps text-tertiary">{t('admin.liveTelemetry')}</span>
          </div>

          {/* Custom SVG Line Chart */}
          <div className="w-full h-72 pt-4">
            <svg viewBox="0 0 500 200" className="w-full h-full text-tertiary">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4ff3f" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#d4ff3f" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Horizontal Grid lines */}
              <line x1="10" y1="30" x2="490" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="10" y1="80" x2="490" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="10" y1="130" x2="490" y2="130" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="10" y1="180" x2="490" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Area Gradient */}
              <path 
                d="M10 180 Q100 130, 200 90 T400 50 L490 30 L490 180 Z" 
                fill="url(#chartGrad)" 
              />

              {/* Main Line path */}
              <path 
                d="M10 180 Q100 130, 200 90 T400 50 L490 30" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />

              {/* Points */}
              <circle cx="10" cy="180" r="3.5" fill="#000" stroke="#d4ff3f" strokeWidth="2" />
              <circle cx="120" cy="120" r="3.5" fill="#000" stroke="#d4ff3f" strokeWidth="2" />
              <circle cx="240" cy="85" r="3.5" fill="#000" stroke="#d4ff3f" strokeWidth="2" />
              <circle cx="360" cy="55" r="3.5" fill="#000" stroke="#d4ff3f" strokeWidth="2" />
              <circle cx="490" cy="30" r="3.5" fill="#000" stroke="#d4ff3f" strokeWidth="2" />
            </svg>
            <div className="flex justify-between font-label-caps text-[8px] text-on-surface-variant/40 pt-2 px-1">
              <span>{t('admin.jan')}</span>
              <span>{t('admin.feb')}</span>
              <span>{t('admin.mar')}</span>
              <span>{t('admin.apr')}</span>
              <span>{t('admin.mayLive')}</span>
            </div>
          </div>
        </div>

        {/* Activity Feed (Right: 4 cols) */}
        <div className="lg:col-span-4 luxury-glass p-6 rounded-xl border border-white/5 flex flex-col justify-between h-[360px]">
          <div className="space-y-md overflow-hidden flex flex-col h-full w-full">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0">
              <h3 className="font-headline-lg text-sm text-white uppercase flex items-center gap-xs">
                <Activity className="w-4 h-4 text-tertiary animate-pulse" /> {t('admin.activityFeed')}
              </h3>
              <button 
                onClick={() => refetchFeed()}
                className="text-[9px] font-label-caps text-on-surface-variant hover:text-white"
                title="Refresh feed"
              >
                {t('admin.refresh')}
              </button>
            </div>
            
            <div className="space-y-sm overflow-y-auto no-scrollbar flex-1 pr-1">
              {activityFeed.map((item: any) => {
                let badgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                if (item.type === 'refund') {
                  badgeColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                } else if (item.type === 'new_order') {
                  badgeColor = 'text-green-400 bg-green-500/10 border-green-500/20';
                }

                return (
                  <div key={item.id} className="p-2.5 bg-white/[0.01] border border-white/5 rounded-lg space-y-1 font-sans text-xs text-start">
                    <div className="flex justify-between items-center gap-xs">
                      <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full border ${badgeColor} shrink-0`}>
                        {getActivityTypeLabel(item.type)}
                      </span>
                      <span className="text-[9px] font-mono text-on-surface-variant/40 shrink-0">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-white font-bold text-[10px] uppercase truncate">{item.title}</p>
                    <p className="text-on-surface-variant text-[10px] leading-relaxed break-normal text-pretty">{item.description}</p>
                  </div>
                );
              })}
              {activityFeed.length === 0 && (
                <div className="py-10 text-center text-on-surface-variant/40 font-mono text-[10px]">
                  {t('admin.noIncidents')}
                </div>
              )}
            </div>
          </div>
        </div>

      </section>

      {/* 4. Recent Orders Table */}
      <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
        <div className="flex justify-between items-center border-b border-white/5 pb-sm">
          <h3 className="font-headline-lg text-lg text-white uppercase">{t('admin.recentCheckout')}</h3>
          <Link href={lLink('/admin/orders')} className="font-label-caps text-[10px] text-tertiary hover:underline">
            {t('admin.manageAllOrders')}
          </Link>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                <th className="py-3">{t('admin.orderId')}</th>
                <th className="py-3">{t('admin.customer')}</th>
                <th className="py-3">{t('admin.email')}</th>
                <th className="py-3">{t('admin.date')}</th>
                <th className="py-3">{t('admin.total')}</th>
                <th className="py-3">{t('admin.status')}</th>
                <th className="py-3 text-end">{t('admin.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans normal-case text-xs text-on-surface-variant">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 text-white font-mono font-bold">{order.orderNumber || order.id}</td>
                  <td className="py-4 font-medium text-white">{order.customerName}</td>
                  <td className="py-4 text-on-surface-variant/70 font-mono">{order.customerEmail}</td>
                  <td className="py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-4 font-medium text-white">{formatPrice(order.total)}</td>
                  <td className="py-4">
                    <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block ${
                      order.status === 'delivered' 
                        ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                        : order.status === 'shipped' 
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500'
                        : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'
                    }`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="py-4 text-end">
                    <Link 
                      href={lLink(`/tracking/${order.id}`)}
                      className="font-label-caps text-[9px] text-tertiary hover:underline"
                    >
                      {t('admin.trackShipment')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
