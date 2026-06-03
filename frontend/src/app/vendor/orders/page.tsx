'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Truck, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { useTranslation } from '../../../providers/I18nProvider';
import { useCurrency } from '../../../providers/CurrencyProvider';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

interface ShippingAddress {
  id: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface MasterOrder {
  id: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  shippingAddress: ShippingAddress;
}

interface VendorOrder {
  id: string;
  orderId: string;
  total: number;
  commission: number;
  payoutAmount: number;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
  createdAt: string;
  shippedAt: string | null;
  order: MasterOrder;
  items: OrderItem[];
}

export default function VendorOrders() {
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Fulfillment Form States
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient.get('/vendor/orders');
      setOrders(res.data);
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  const openFulfillmentModal = (order: VendorOrder) => {
    setSelectedOrder(order);
    setCarrier('DHL');
    setTrackingNumber('');
  };

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      await apiClient.patch(`/vendor/orders/${selectedOrder.id}/fulfill`, {
        carrier,
        trackingNumber
      });
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-md">
        <Loader2 className="h-8 w-8 text-tertiary animate-spin" />
        <span className="text-sm text-on-surface-variant font-semibold">
          {t('vendor.loadingOrders')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-xl text-start">
      <div className="flex justify-between items-center border-b border-outline-variant pb-md">
        <div>
          <h1 className="font-display-lg text-2xl text-white uppercase font-black">
            {t('vendor.orderFulfillment')}
          </h1>
          <p className="text-on-surface-variant text-xs mt-xs">
            {t('vendor.orderFulfillmentDesc')}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded">
          {errorMsg}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="luxury-glass p-12 rounded-xl text-center border border-outline-variant space-y-sm text-on-surface-variant">
          <Truck className="h-10 w-10 text-white/20 mx-auto" />
          <p className="text-sm font-semibold">
            {t('vendor.noOrders')}
          </p>
        </div>
      ) : (
        <div className="space-y-md">
          {orders.map((vendorOrder) => {
            const isExpanded = expandedOrderId === vendorOrder.id;
            const formattedDate = new Date(vendorOrder.createdAt).toLocaleDateString(
              locale === 'ar' ? 'ar-EG' : 'en-US',
              { year: 'numeric', month: 'short', day: 'numeric' }
            );

            return (
              <div 
                key={vendorOrder.id} 
                className="luxury-glass rounded-xl border border-outline-variant overflow-hidden transition-all duration-300"
              >
                {/* Header Card Area */}
                <div 
                  onClick={() => toggleExpandOrder(vendorOrder.id)}
                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-md cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="space-y-xs">
                    <div className="flex items-center gap-sm">
                      <span className="font-mono text-xs font-bold text-white uppercase">
                        {t('vendor.orderIdLabel', { id: vendorOrder.id.slice(-8).toUpperCase() })}
                      </span>
                      <span className="text-xs text-on-surface-variant">|</span>
                      <span className="text-xs text-on-surface-variant">{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-md pt-0.5">
                      <span className="text-xs text-on-surface-variant flex items-center gap-xs">
                        <User className="h-3.5 w-3.5 text-on-surface-variant/70" />
                        {vendorOrder.order?.user?.name || 'APEX Customer'}
                      </span>
                      <span className="text-xs text-on-surface-variant">•</span>
                      <span className="text-xs text-on-surface-variant">
                        {vendorOrder.items.reduce((sum, item) => sum + item.quantity, 0)} {t('vendor.itemsCountLabel')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-md w-full md:w-auto justify-between md:justify-end">
                    <div className="text-start md:text-end pe-md">
                      <span className="text-[10px] font-label-caps text-on-surface-variant block">{t('vendor.netEarningsLabel')}</span>
                      <span className="text-md font-black text-tertiary">{formatPrice(vendorOrder.payoutAmount)}</span>
                    </div>

                    <div className="flex items-center gap-sm">
                      {/* Status pill */}
                      <span className={`text-[10px] font-bold font-label-caps px-2.5 py-1 rounded flex items-center gap-xs ${
                        vendorOrder.status === 'shipped' || vendorOrder.status === 'delivered'
                          ? 'bg-green-500/20 border border-green-500/10 text-green-400'
                          : 'bg-yellow-500/20 border border-yellow-500/10 text-yellow-500'
                      }`}>
                        {vendorOrder.status === 'shipped' || vendorOrder.status === 'delivered' ? (
                          <>
                            <CheckCircle className="h-3 w-3 shrink-0" />
                            {t('vendor.shipped')}
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 shrink-0" />
                            {t('vendor.pending')}
                          </>
                        )}
                      </span>

                      {isExpanded ? <ChevronUp className="h-4 w-4 text-on-surface-variant" /> : <ChevronDown className="h-4 w-4 text-on-surface-variant" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="border-t border-outline-variant p-6 bg-black/20 space-y-lg font-sans">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
                      {/* 1. Items List */}
                      <div className="lg:col-span-2 space-y-sm">
                        <h4 className="text-[11px] font-label-caps text-white font-bold border-b border-white/5 pb-2">
                          {t('vendor.orderedItems')}
                        </h4>
                        <div className="divide-y divide-white/5">
                          {vendorOrder.items.map((item) => (
                            <div key={item.id} className="py-3 flex justify-between items-center gap-md">
                              <div className="space-y-0.5">
                                <p className="text-sm font-semibold text-white">{item.productName}</p>
                                <div className="flex flex-wrap gap-xs text-xs text-on-surface-variant">
                                  {item.size && <span>{t('vendor.sizeLabel')}: {item.size}</span>}
                                  {item.size && item.color && <span>•</span>}
                                  {item.color && <span>{t('vendor.colorLabel')}: {item.color}</span>}
                                  <span>•</span>
                                  <span>{t('vendor.qty')}: {item.quantity}</span>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-white">
                                {formatPrice(item.productPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-md border-t border-white/5 text-xs text-on-surface-variant">
                          <span>{t('vendor.totalSuborder')}: {formatPrice(vendorOrder.total)}</span>
                          <span>{t('vendor.platformFee')}: -{formatPrice(vendorOrder.commission)}</span>
                        </div>
                      </div>

                      {/* 2. Customer and Delivery Info */}
                      <div className="space-y-lg">
                        <div className="space-y-sm">
                          <h4 className="text-[11px] font-label-caps text-white font-bold border-b border-white/5 pb-2">
                            {t('vendor.deliveryProfile')}
                          </h4>
                          {vendorOrder.order?.shippingAddress ? (
                            <div className="space-y-md text-xs text-on-surface-variant">
                              <div className="flex items-start gap-xs">
                                <MapPin className="h-4 w-4 shrink-0 text-on-surface-variant/70 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-white">
                                    {vendorOrder.order.shippingAddress.addressLine1}
                                  </p>
                                  {vendorOrder.order.shippingAddress.addressLine2 && (
                                    <p>{vendorOrder.order.shippingAddress.addressLine2}</p>
                                  )}
                                  <p>
                                    {vendorOrder.order.shippingAddress.city}, {vendorOrder.order.shippingAddress.state} {vendorOrder.order.shippingAddress.postalCode}
                                  </p>
                                  <p className="text-[10px] text-white/50">{vendorOrder.order.shippingAddress.country}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-xs">
                                <Mail className="h-3.5 w-3.5 text-on-surface-variant/70" />
                                <span>{vendorOrder.order.user?.email || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-xs">
                                <Phone className="h-3.5 w-3.5 text-on-surface-variant/70" />
                                <span>{vendorOrder.order.shippingAddress.phone || 'N/A'}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-on-surface-variant italic">{t('vendor.noAddress')}</p>
                          )}
                        </div>

                        {/* Fulfill Action / Tracking Details */}
                        <div className="space-y-md pt-sm border-t border-white/5">
                          {vendorOrder.status === 'shipped' || vendorOrder.status === 'delivered' ? (
                            <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4 space-y-sm text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant">{t('vendor.carrier')}:</span>
                                <span className="font-bold text-white uppercase">{vendorOrder.carrier}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant">{t('vendor.trackingNumber')}:</span>
                                <span className="font-bold text-white select-all">{vendorOrder.trackingNumber}</span>
                              </div>
                              {vendorOrder.shippedAt && (
                                <div className="text-[10px] text-on-surface-variant/60 pt-xs border-t border-white/5">
                                  {t('vendor.shippedOn', { date: new Date(vendorOrder.shippedAt).toLocaleString() })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  openFulfillmentModal(vendorOrder);
                              }}
                              className="w-full bg-white text-black hover:bg-tertiary px-4 py-2.5 font-button text-[11px] uppercase rounded font-bold transition-all flex items-center justify-center gap-xs"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              {t('vendor.fulfillShipment')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fulfillment Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant w-full max-w-md rounded-2xl p-6 space-y-lg relative text-start font-sans">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="font-display-lg text-lg text-white uppercase font-black">
                {t('vendor.submitShipmentInfo')}
              </h3>
              <p className="text-xs text-on-surface-variant mt-sm">
                Fulfill order for #{selectedOrder.id.slice(-8).toUpperCase()}. Enter carrier details and routing references.
              </p>
            </div>

            <form onSubmit={handleFulfillSubmit} className="space-y-md">
              <div className="space-y-xs">
                <label className="text-[10px] font-label-caps text-on-surface-variant block uppercase">
                  {t('vendor.shippingCarrier')}
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  required
                  className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none cursor-pointer"
                >
                  <option value="DHL">DHL Express</option>
                  <option value="FedEx">FedEx International</option>
                  <option value="UPS">UPS Worldwide</option>
                  <option value="USPS">USPS Priority</option>
                  <option value="Aramex">Aramex</option>
                </select>
              </div>

              <div className="space-y-xs">
                <label className="text-[10px] font-label-caps text-on-surface-variant block uppercase">
                  {t('vendor.trackingNumberLabel')}
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  required
                  className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                  placeholder="e.g. 1Z999AA10123456784"
                />
              </div>

              <div className="flex gap-md pt-md border-t border-white/5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-tertiary text-on-tertiary hover:opacity-90 py-3 rounded font-button text-xs uppercase font-bold transition-all flex items-center justify-center gap-xs"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('vendor.confirmShipment')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-3 border border-outline-variant hover:bg-white/5 text-white rounded font-button text-xs uppercase font-bold transition-all"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
