'use client';

import React, { useState } from 'react';
import { 
  useAdminOrdersQuery, 
  useUpdateOrderStatusMutation, 
  useUpdateOrderTrackingMutation, 
  useCancelOrderMutation, 
  useRefundOrderMutation 
} from '../../../hooks/useAdmin';
import { Loader2, Truck, XCircle, RefreshCw, Undo2, Award, ClipboardList, Check, HelpCircle } from 'lucide-react';
import { Order } from '../../../types/index';
import { useToast } from '../../../providers/ToastProvider';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const { data: orders = [], isLoading, refetch } = useAdminOrdersQuery();
  const { locale, t } = useTranslation();

  // Mutations
  const updateStatusMutation = useUpdateOrderStatusMutation();
  const updateTrackingMutation = useUpdateOrderTrackingMutation();
  const cancelOrderMutation = useCancelOrderMutation();
  const refundOrderMutation = useRefundOrderMutation();

  // Detail Panel/Modal active order
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Form states
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const handleStatusChange = (orderId: string, status: string) => {
    updateStatusMutation.mutate({ id: orderId, status, notes: statusNotes || undefined }, {
      onSuccess: () => {
        setStatusNotes('');
        if (activeOrder?.id === orderId) {
          setActiveOrder(prev => prev ? { ...prev, status } as any : null);
        }
      }
    });
  };

  const handleTrackingSubmit = (e: React.FormEvent, orderId: string) => {
    e.preventDefault();
    if (!trackingNumber || !carrier) {
      showToast(t('adminOrders.toast.specifyCarrier'), 'error');
      return;
    }

    updateTrackingMutation.mutate({
      id: orderId,
      trackingNumber,
      carrier
    }, {
      onSuccess: () => {
        setTrackingNumber('');
        setCarrier('');
        refetch();
        if (activeOrder?.id === orderId) {
          setActiveOrder(prev => prev ? { ...prev, trackingNumber, carrier, status: 'shipped' } as any : null);
        }
      }
    });
  };

  const handleCancelSubmit = (orderId: string) => {
    if (confirm(t('adminOrders.toast.confirmCancel'))) {
      cancelOrderMutation.mutate({
        id: orderId,
        notes: cancelNotes || undefined
      }, {
        onSuccess: () => {
          setCancelNotes('');
          refetch();
          if (activeOrder?.id === orderId) {
            setActiveOrder(prev => prev ? { ...prev, status: 'cancelled' } as any : null);
          }
        }
      });
    }
  };

  const handleRefundSubmit = (e: React.FormEvent, orderId: string) => {
    e.preventDefault();
    if (!refundReason) {
      showToast(t('adminOrders.toast.refundReason'), 'error');
      return;
    }

    const amt = refundAmount ? parseFloat(refundAmount) : undefined;

    refundOrderMutation.mutate({
      id: orderId,
      amount: amt,
      reason: refundReason
    }, {
      onSuccess: () => {
        setRefundAmount('');
        setRefundReason('');
        refetch();
        if (activeOrder?.id === orderId) {
          setActiveOrder(prev => prev ? { ...prev, paymentStatus: 'refunded', status: 'refunded' } as any : null);
        }
      }
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-label-caps text-xs">{t('adminOrders.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl text-left">
      
      {/* Header */}
      <div className="border-b border-white/5 pb-lg flex flex-col sm:flex-row sm:justify-between sm:items-end gap-md">
        <div>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('adminOrders.title')}</h1>
          <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
            {t('adminOrders.desc')}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 border border-white/10 rounded-lg text-[10px] font-label-caps text-white bg-white/[0.01] hover:bg-white/[0.02] flex items-center gap-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('adminOrders.sync')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* Table of Orders (Left: 8 cols if panel active, otherwise 12) */}
        <div className={`transition-all duration-300 ${activeOrder ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
            <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2">
              {t('adminOrders.operationsCount', { count: formatNumber(orders.length) })}
            </h3>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                    <th className="py-3">{t('adminOrders.table.orderId')}</th>
                    <th className="py-3">{t('adminOrders.table.customer')}</th>
                    <th className="py-3">{t('adminOrders.table.total')}</th>
                    <th className="py-3">{t('adminOrders.table.orderDate')}</th>
                    <th className="py-3">{t('adminOrders.table.payment')}</th>
                    <th className="py-3">{t('adminOrders.table.status')}</th>
                    <th className="py-3 text-right">{t('adminOrders.table.manage')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
                  {orders.map((order) => {
                    const isSelected = activeOrder?.id === order.id;
                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => {
                          setActiveOrder(order);
                          // Reset form values when order changes
                          setTrackingNumber(order.trackingNumber || '');
                          setCarrier(order.carrier || '');
                        }}
                        className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${isSelected ? 'bg-white/[0.02]' : ''}`}
                      >
                        <td className="py-4 text-white font-mono font-bold">{order.orderNumber || order.id.slice(0, 8)}</td>
                        <td className="py-4">
                          <p className="font-bold text-white uppercase">{order.user?.name || t('adminOrders.panel.guest')}</p>
                          <p className="text-[10px] text-on-surface-variant/60 font-mono mt-0.5">{order.user?.email || 'N/A'}</p>
                        </td>
                        <td className="py-4 font-medium text-white font-mono">{formatPrice(order.total)}</td>
                        <td className="py-4 text-[10px]">{formatDate(order.createdAt)}</td>
                        <td className="py-4">
                          <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block ${
                            order.paymentStatus === 'paid'
                              ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                              : order.paymentStatus === 'refunded'
                              ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                              : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'
                          }`}>
                            {order.paymentStatus === 'paid' ? t('admin.active') : order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block ${
                            order.status === 'delivered' 
                              ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                              : order.status === 'shipped' 
                              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500'
                              : order.status === 'cancelled' || order.status === 'refunded'
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                              : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'
                          }`}>
                            {order.status === 'delivered' ? t('tracking.delivered') : order.status === 'shipped' ? t('tracking.shipped') : order.status === 'processing' ? t('tracking.processing') : order.status}
                          </span>
                        </td>
                        <td className="py-4 text-right font-label-caps text-tertiary text-[9px]">
                          {t('adminOrders.inspect')}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-on-surface-variant/40 font-mono">
                        {t('adminOrders.noTransactions')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Selected Order Panel (Right: 5 cols) */}
        {activeOrder && (
          <div className="lg:col-span-5 luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg h-fit animate-fade-in relative">
            <button 
              onClick={() => setActiveOrder(null)} 
              className="absolute right-4 top-4 text-on-surface-variant hover:text-white cursor-pointer border-0 bg-transparent"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[9px] font-mono text-tertiary tracking-widest uppercase">{t('adminOrders.panel.title')}</span>
              <h3 className="font-headline-lg text-lg text-white uppercase mt-1">
                {t('adminOrders.panel.orderNum', { id: activeOrder.orderNumber || activeOrder.id.slice(0, 8) })}
              </h3>
              <p className="text-[10px] text-on-surface-variant/60 font-mono mt-0.5">{t('adminOrders.panel.dbUid', { id: activeOrder.id })}</p>
            </div>

            {/* Customer specs */}
            <div className="border-t border-b border-white/5 py-4 space-y-sm text-xs font-sans text-on-surface-variant">
              <div>
                <span className="font-label-caps text-[9px] text-on-surface-variant/40 block mb-1">{t('adminOrders.panel.consignee')}</span>
                <p className="text-white font-bold uppercase">{activeOrder.user?.name || t('adminOrders.panel.guest')}</p>
                <p className="text-on-surface-variant/70 font-mono text-[10px]">{activeOrder.user?.email || 'N/A'}</p>
              </div>

              {activeOrder.shippingAddress && (
                <div>
                  <span className="font-label-caps text-[9px] text-on-surface-variant/40 block mb-1">{t('adminOrders.panel.destination')}</span>
                  <p className="text-white normal-case">{activeOrder.shippingAddress.address}, {activeOrder.shippingAddress.city}</p>
                  <p className="text-on-surface-variant/60 font-mono text-[10px]">{activeOrder.shippingAddress.country} ({activeOrder.shippingAddress.postalCode})</p>
                  {activeOrder.shippingAddress.phone && (
                    <p className="text-[10px] font-mono mt-1">Tel: {activeOrder.shippingAddress.phone}</p>
                  )}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-sm">
              <span className="font-label-caps text-[9px] text-on-surface-variant/40 block">{t('adminOrders.panel.items')}</span>
              <div className="max-h-40 overflow-y-auto space-y-xs pr-1 no-scrollbar">
                {activeOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-2 rounded text-xs font-sans">
                    <div className="flex items-center gap-xs">
                      {item.image && (
                        <img src={item.image} className="w-8 h-10 object-cover rounded" alt="" />
                      )}
                      <div>
                        <p className="font-bold text-white uppercase truncate max-w-[150px]">{item.productName}</p>
                        <p className="text-[9px] text-on-surface-variant/60 font-mono">
                          {t('adminOrders.panel.sizeColor', { size: item.size, color: item.color })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px]">
                      <p className="text-white">{formatNumber(item.quantity)}x</p>
                      <p className="text-on-surface-variant/60">{formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fulfillment controls */}
            <div className="space-y-md border-t border-white/5 pt-lg text-left">
              <span className="font-label-caps text-[9px] text-on-surface-variant block">{t('adminOrders.panel.fulfillment')}</span>
              
              {/* Status Select dropdown */}
              <div className="space-y-xs">
                <label className="font-label-caps text-[8px] text-on-surface-variant/50">{t('adminOrders.panel.transitionState')}</label>
                <div className="flex gap-xs">
                  <select
                    value={activeOrder.status}
                    onChange={(e) => handleStatusChange(activeOrder.id, e.target.value)}
                    className="bg-background border border-white/10 rounded-lg px-3 py-2 text-[10px] font-label-caps text-white focus:outline-none focus:border-tertiary cursor-pointer flex-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>

              {/* Log Status notes */}
              <div className="space-y-xs">
                <input
                  type="text"
                  placeholder={t('adminOrders.panel.notesPlaceholder')}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full bg-background border border-white/10 px-3 py-2 text-white text-xs rounded-lg outline-none focus:border-tertiary font-sans"
                />
              </div>

              {/* Carrier Tracking Form */}
              {activeOrder.status !== 'delivered' && activeOrder.status !== 'cancelled' && (
                <form onSubmit={(e) => handleTrackingSubmit(e, activeOrder.id)} className="p-3 bg-white/[0.01] border border-white/5 rounded-lg space-y-sm text-xs">
                  <span className="font-label-caps text-[8px] text-tertiary flex items-center gap-xs">
                    <Truck className="w-3.5 h-3.5" /> {t('adminOrders.panel.dispatch')}
                  </span>
                  <div className="grid grid-cols-2 gap-xs">
                    <input
                      type="text"
                      placeholder={t('adminOrders.panel.carrierPlaceholder')}
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      className="bg-background border border-white/10 px-2 py-1.5 text-white text-[10px] rounded outline-none focus:border-tertiary"
                      required
                    />
                    <input
                      type="text"
                      placeholder={t('adminOrders.panel.codePlaceholder')}
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="bg-background border border-white/10 px-2 py-1.5 text-white text-[10px] rounded outline-none focus:border-tertiary font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updateTrackingMutation.isPending}
                    className="w-full py-2 bg-white text-black font-button text-[9px] uppercase rounded hover:brightness-105 transition-all cursor-pointer border-0"
                  >
                    {updateTrackingMutation.isPending ? 'Saving...' : t('adminOrders.panel.registerTracking')}
                  </button>
                </form>
              )}

              {/* Stripe Refund interface */}
              {activeOrder.paymentStatus === 'paid' && (
                <form onSubmit={(e) => handleRefundSubmit(e, activeOrder.id)} className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg space-y-sm text-xs">
                  <span className="font-label-caps text-[8px] text-purple-400 flex items-center gap-xs">
                    <Undo2 className="w-3.5 h-3.5" /> {t('adminOrders.panel.stripeRefund')}
                  </span>
                  <div className="grid grid-cols-2 gap-xs">
                    <input
                      type="number"
                      step="0.01"
                      placeholder={t('adminOrders.panel.maxAmount', { amount: activeOrder.total })}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="bg-background border border-white/10 px-2 py-1.5 text-white text-[10px] rounded outline-none focus:border-tertiary font-mono"
                    />
                    <input
                      type="text"
                      placeholder={t('adminOrders.panel.reasonPlaceholder')}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="bg-background border border-white/10 px-2 py-1.5 text-white text-[10px] rounded outline-none focus:border-tertiary"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={refundOrderMutation.isPending}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-button text-[9px] uppercase rounded transition-all cursor-pointer border-0"
                  >
                    {refundOrderMutation.isPending ? 'Processing Refund...' : t('adminOrders.panel.authorizeRefund')}
                  </button>
                </form>
              )}

              {/* Cancel Order Action */}
              {activeOrder.status !== 'cancelled' && activeOrder.status !== 'delivered' && activeOrder.status !== 'refunded' && (
                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg space-y-sm text-xs">
                  <span className="font-label-caps text-[8px] text-red-400 flex items-center gap-xs">
                    <XCircle className="w-3.5 h-3.5" /> {t('adminOrders.panel.termination')}
                  </span>
                  <input
                    type="text"
                    placeholder={t('adminOrders.panel.cancellationPlaceholder')}
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    className="w-full bg-background border border-white/10 px-3 py-1.5 text-white text-[10px] rounded outline-none focus:border-tertiary"
                  />
                  <button
                    onClick={() => handleCancelSubmit(activeOrder.id)}
                    disabled={cancelOrderMutation.isPending}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-button text-[9px] uppercase rounded transition-all cursor-pointer border-0"
                  >
                    {cancelOrderMutation.isPending ? 'Terminating...' : t('adminOrders.panel.cancelAction')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
