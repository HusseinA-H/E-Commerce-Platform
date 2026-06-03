'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { ChevronRight, Loader2, Truck, Check, HelpCircle, XCircle, Undo2, MapPin, Package, Calendar } from 'lucide-react';
import { SafeImage } from '../../../components/SafeImage';
import QRCode from '../../../components/QRCode';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { useTranslation } from '../../../providers/I18nProvider';

export default function OrderTrackingPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { locale, t } = useTranslation();

  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  // Fetch order details dynamically from the database
  const { data: order, isLoading, error } = useQuery<any>({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await apiClient.get(`/orders/${id}`);
      return response.data;
    },
    refetchInterval: 15000, // Auto-refresh tracking info every 15s for real-time feel
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-md text-center px-6">
        <Loader2 className="h-10 w-10 text-tertiary animate-spin" />
        <h3 className="font-headline-lg text-lg text-white">{t('tracking.locatingLogs')}</h3>
        <p className="text-on-surface-variant text-xs font-mono">{t('tracking.establishingLink')}</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-md text-center px-6">
        <XCircle className="h-12 w-12 text-red-500" />
        <h3 className="font-headline-lg text-lg text-white">{t('tracking.notFound')}</h3>
        <p className="text-on-surface-variant text-sm max-w-sm normal-case">
          {t('tracking.notFoundDesc', { id })}
        </p>
        <button 
          onClick={() => router.push(lLink('/profile'))}
          className="px-6 py-3 bg-white text-black rounded font-button text-xs uppercase hover:bg-tertiary transition-colors"
        >
          {t('tracking.returnProfile')}
        </button>
      </div>
    );
  }

  // Determine stepper status index
  const statusSteps = ['pending', 'processing', 'shipped', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.status);

  // Generate logistics updates logs from orderEvents database
  const logs = order.events ? order.events.map((evt: any) => ({
    time: new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date(evt.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    title: evt.status.replace(/_/g, ' ').toUpperCase(),
    desc: evt.notes || `Fulfillment state transitioned to ${evt.status}.`
  })).reverse() : [];

  const isTerminal = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="bg-[#080808] text-on-background min-h-screen pb-xxl text-start">
      <main className="pt-8 px-6 md:px-margin-desktop max-w-container-max mx-auto space-y-xxl">
        
        {/* Header */}
        <div className="border-b border-white/5 pb-lg flex flex-col sm:flex-row justify-between items-start sm:items-end gap-md">
          <div>
            <nav className="flex items-center gap-xs font-label-caps text-label-caps text-on-surface-variant/40 text-[10px] tracking-widest mb-md">
              <Link href={lLink('/')} className="hover:text-on-surface transition-colors">{t('nav.home')}</Link>
              <ChevronRight className="h-3 w-3 rtl:rotate-180" />
              <Link href={lLink('/profile')} className="hover:text-on-surface transition-colors">{t('nav.profile')}</Link>
              <ChevronRight className="h-3 w-3 rtl:rotate-180" />
              <span className="text-tertiary">{t('profile.track')} {order.orderNumber || order.id.slice(0, 8)}</span>
            </nav>
            <h1 className="font-display-lg text-balance text-3xl md:text-5xl text-white uppercase tracking-tight">
              {t('tracking.title')}
            </h1>
            <p className="text-on-surface-variant text-sm leading-relaxed text-pretty mt-sm">
              {t('tracking.subtitle', { id: order.orderNumber || order.id })}
            </p>
          </div>
          <div className="bg-surface-low border border-white/5 p-4 rounded-lg flex flex-col items-end shrink-0">
            <span className="text-[10px] font-label-caps text-on-surface-variant/50">{t('tracking.estimatedDelivery')}</span>
            <span className="text-tertiary font-bold text-sm uppercase">
              {order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : t('tracking.pendingDispatch')}
            </span>
          </div>
        </div>

        {/* Stepper Status Bar (if not cancelled or refunded) */}
        {!isTerminal ? (
          <section className="luxury-glass p-8 rounded-xl border border-white/5">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-lg">
              
              {/* Step 1: Placed */}
              <div className="flex-1 flex flex-col items-center text-center space-y-xs relative">
                <div className="w-10 h-10 rounded-full bg-tertiary text-black flex items-center justify-center font-bold text-sm z-10 shadow-[0_0_15px_rgba(212,255,63,0.3)]">
                  ✓
                </div>
                <span className="font-label-caps text-xs text-white">{t('tracking.orderPlaced')}</span>
                <span className="text-[10px] text-on-surface-variant/60 font-sans">{t('tracking.paymentCleared')}</span>
              </div>

              <div className={`hidden md:block h-0.5 flex-1 transition-colors duration-500 ${currentStepIndex >= 1 ? 'bg-tertiary' : 'bg-white/10'}`}></div>

              {/* Step 2: Processing */}
              <div className="flex-1 flex flex-col items-center text-center space-y-xs relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all duration-500 ${
                  currentStepIndex >= 1 ? 'bg-tertiary text-black shadow-[0_0_15px_rgba(212,255,63,0.3)]' : 'border border-white/10 text-white/40 bg-background'
                }`}>
                  {currentStepIndex > 1 ? '✓' : '02'}
                </div>
                <span className={`font-label-caps text-xs ${currentStepIndex >= 1 ? 'text-white' : 'text-white/40'}`}>{t('tracking.processing')}</span>
                <span className="text-[10px] text-on-surface-variant/60 font-sans">{t('tracking.warehousePacking')}</span>
              </div>

              <div className={`hidden md:block h-0.5 flex-1 transition-colors duration-500 ${currentStepIndex >= 2 ? 'bg-tertiary' : 'bg-white/10'}`}></div>

              {/* Step 3: Shipped */}
              <div className="flex-1 flex flex-col items-center text-center space-y-xs relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all duration-500 ${
                  currentStepIndex >= 2 ? 'bg-tertiary text-black shadow-[0_0_15px_rgba(212,255,63,0.3)]' : 'border border-white/10 text-white/40 bg-background'
                }`}>
                  {currentStepIndex > 2 ? '✓' : '03'}
                </div>
                <span className={`font-label-caps text-xs ${currentStepIndex >= 2 ? 'text-white' : 'text-white/40'}`}>{t('tracking.shipped')}</span>
                <span className="text-[10px] text-on-surface-variant/60 font-sans">{order.carrier ? `${order.carrier}` : t('tracking.transit')}</span>
              </div>

              <div className={`hidden md:block h-0.5 flex-1 transition-colors duration-500 ${currentStepIndex >= 3 ? 'bg-tertiary' : 'bg-white/10'}`}></div>

              {/* Step 4: Delivered */}
              <div className="flex-1 flex flex-col items-center text-center space-y-xs relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all duration-500 ${
                  currentStepIndex >= 3 ? 'bg-tertiary text-black shadow-[0_0_15px_rgba(212,255,63,0.3)]' : 'border border-white/10 text-white/40 bg-background'
                }`}>
                  {currentStepIndex >= 3 ? '✓' : '04'}
                </div>
                <span className={`font-label-caps text-xs ${currentStepIndex >= 3 ? 'text-white' : 'text-white/40'}`}>{t('tracking.delivered')}</span>
                <span className="text-[10px] text-on-surface-variant/60 font-sans">{t('tracking.arrivalConfirm')}</span>
              </div>

            </div>
          </section>
        ) : (
          /* Terminal State Banner */
          <section className={`p-6 rounded-xl border flex items-center gap-md ${
            order.status === 'refunded' 
              ? 'bg-purple-500/5 border-purple-500/10 text-purple-400' 
              : 'bg-red-500/5 border-red-500/10 text-red-500'
          }`}>
            {order.status === 'refunded' ? <Undo2 className="w-8 h-8 shrink-0 animate-bounce" /> : <XCircle className="w-8 h-8 shrink-0 animate-pulse" />}
            <div>
              <h3 className="font-headline-lg text-lg uppercase font-bold text-white">{t('tracking.terminated', { status: order.status.toUpperCase() })}</h3>
              <p className="text-xs text-on-surface-variant mt-1 normal-case">
                {order.status === 'refunded' ? t('tracking.refundedDesc') : t('tracking.cancelledDesc')}
              </p>
            </div>
          </section>
        )}

        {/* Layout split: Maps/Logs & Order summary details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-start">
          
          {/* Tracking Map & Logs (Left: 8 cols) */}
          <div className="lg:col-span-8 space-y-lg">
            
            {/* Map Placement with simulated carrier routing */}
            <div className="h-80 rounded-xl border border-white/5 bg-surface-low overflow-hidden relative group">
              <div className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px),
                    radial-gradient(circle at 30% 40%, rgba(212,255,63,0.15) 0%, transparent 50%),
                    radial-gradient(circle at 70% 60%, rgba(212,255,63,0.1) 0%, transparent 50%)
                  `,
                  backgroundSize: '40px 40px, 40px 40px, 200px 200px, 180px 180px'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
              
              {/* Routing visual points */}
              {!isTerminal && (
                <>
                  <div className="absolute top-1/2 left-1/4 w-1/2 h-0.5 border-t-2 border-dashed border-tertiary"></div>
                  <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-black flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                  </div>
                  
                  {currentStepIndex >= 2 ? (
                    <div className="absolute top-1/2 left-3/4 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-black flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                    </div>
                  ) : null}

                  <div className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-tertiary flex items-center justify-center shadow-[0_0_15px_rgba(212,255,63,0.5)] transition-all duration-[2000ms]`}
                    style={{ 
                      [locale === 'ar' ? 'right' : 'left']: currentStepIndex === 0 
                        ? '25%' 
                        : currentStepIndex === 1 
                        ? '40%' 
                        : currentStepIndex === 2 
                        ? '60%' 
                        : '75%' 
                    }}
                  >
                    <Truck className="h-4 w-4 text-black font-bold animate-bounce rtl:-scale-x-100" />
                  </div>
                </>
              )}
 
              <div className="absolute bottom-6 start-6 luxury-glass px-4 py-2.5 rounded text-xs font-label-caps text-white flex items-center gap-xs">
                <MapPin className="w-4 h-4 text-tertiary" />
                {isTerminal ? t('tracking.terminated', { status: '' }) : order.status === 'delivered' ? t('tracking.delivered') : `${t('tracking.transit')} -> ${(order.shippingAddress?.city || '').toUpperCase()}`}
              </div>
            </div>

            {/* Tracking logs timeline from database */}
            <div className="luxury-glass p-8 rounded-xl border border-white/5 space-y-lg">
              <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2">{t('tracking.timelineEvents')}</h3>
              
              <div className="relative border-s border-white/10 ps-6 ms-2 space-y-lg">
                {logs.map((log: any, index: number) => (
                  <div key={index} className="relative group">
                    {/* Circle timeline nodes */}
                    <span className={`absolute -start-9 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background ${
                      index === 0 ? 'border-tertiary bg-tertiary text-black' : 'border-white/10 text-white/40'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-black animate-ping' : 'bg-white/40'}`}></span>
                    </span>
                    
                    <div className="space-y-xs">
                      <div className="flex items-center gap-sm">
                        <h4 className="font-button text-xs uppercase text-white font-bold">{log.title}</h4>
                        <span className="text-[10px] text-on-surface-variant/40 font-mono">{log.date} - {log.time}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant font-sans normal-case text-pretty leading-relaxed">{log.desc}</p>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-xs text-on-surface-variant/40 font-mono italic">{t('tracking.noEvents')}</p>
                )}
              </div>
            </div>

          </div>

          {/* Order Details Receipt (Right: 4 cols) */}
          <div className="lg:col-span-4">
            <div className="luxury-glass p-8 rounded-xl border border-white/5 space-y-lg">
              <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-sm">{t('tracking.orderSummary')}</h3>
              
              {/* Product items list */}
              <div className="space-y-md border-b border-white/5 pb-md">
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-sm text-xs font-sans">
                    <div className="w-12 h-14 bg-surface-low rounded overflow-hidden relative shrink-0 border border-white/5">
                      <SafeImage className="w-full h-full object-cover" src={item.image} alt={item.productName} />
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <h4 className="font-bold text-white uppercase break-normal text-pretty">{item.productName}</h4>
                      <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                        {t('tracking.qtySize', { qty: item.quantity, size: item.size })}
                      </p>
                    </div>
                    <div className="font-mono text-white py-0.5">{formatPrice(item.productPrice * item.quantity, order.currency?.toUpperCase())}</div>
                  </div>
                ))}
              </div>

              {/* Delivery destination address */}
              <div className="space-y-xs text-xs font-sans normal-case text-on-surface-variant border-b border-white/5 pb-md">
                <span className="font-label-caps text-[9px] text-white block mb-xs">{t('tracking.destination')}</span>
                <p className="font-bold text-white uppercase">{order.user?.name}</p>
                <p>{order.shippingAddress?.address}</p>
                <p>
                  {order.shippingAddress?.postalCode} {order.shippingAddress?.city}
                </p>
                <p>{order.shippingAddress?.country}</p>
                {order.shippingAddress?.phone && (
                  <p className="text-[10px] font-mono text-on-surface-variant/60 mt-1">Tel: {order.shippingAddress.phone}</p>
                )}
              </div>

              {/* Carrier details */}
              {order.trackingNumber && (
                <div className="space-y-xs text-xs font-sans normal-case text-on-surface-variant border-b border-white/5 pb-md">
                  <span className="font-label-caps text-[9px] text-white block mb-xs">{t('tracking.details')}</span>
                  <p className="font-bold text-white uppercase">{order.carrier} {t('tracking.express')}</p>
                  <p className="font-mono text-[10px] text-tertiary break-all select-all">{order.trackingNumber}</p>
                </div>
              )}

              {/* Cost Calculations */}
              <div className="space-y-sm text-xs font-sans normal-case text-on-surface-variant border-b border-white/5 pb-md">
                <div className="flex justify-between">
                  <span>{t('cart.subtotal')}</span>
                  <span className="text-white font-mono">{formatPrice(order.subtotal, order.currency?.toUpperCase())}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('cart.promoCode')}</span>
                  <span className="text-red-400 font-mono">-{formatPrice(order.discount, order.currency?.toUpperCase())}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('cart.tax')}</span>
                  <span className="text-white font-mono">{formatPrice(order.tax, order.currency?.toUpperCase())}</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <span className="font-label-caps text-[10px] text-white">{t('tracking.totalPaid')}</span>
                <span className="font-headline-lg text-lg text-tertiary font-mono">{formatPrice(order.total, order.currency?.toUpperCase())}</span>
              </div>
              <div className="border-t border-white/5 pt-4 mt-4 flex justify-center">
                <QRCode type="order" value={order.id} className="w-full bg-black/20" />
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
