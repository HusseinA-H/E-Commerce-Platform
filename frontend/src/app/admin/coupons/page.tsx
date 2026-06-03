'use client';

import React, { useState } from 'react';
import { useCouponsQuery, useCreateCouponMutation, useToggleCouponMutation } from '../../../hooks/useAdmin';
import { Loader2, Tag, Percent, Calendar, Activity, Check, Plus, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminCouponsPage() {
  const { t } = useTranslation();
  const dataQuery = useCouponsQuery();
  const coupons = dataQuery.data || [];
  const isLoading = dataQuery.isLoading;
  const createCouponMutation = useCreateCouponMutation();
  const toggleCouponMutation = useToggleCouponMutation();

  // Form states
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!code || !discountPercent || !expiresAt || !maxUses) {
      setErrorMessage(t('adminCoupons.allParamsRequired'));
      return;
    }

    const discountVal = parseFloat(discountPercent);
    if (isNaN(discountVal) || discountVal <= 0 || discountVal > 100) {
      setErrorMessage(t('adminCoupons.discountPercentRange'));
      return;
    }

    const maxUsesVal = parseInt(maxUses);
    if (isNaN(maxUsesVal) || maxUsesVal <= 0) {
      setErrorMessage(t('adminCoupons.maxUsesPositive'));
      return;
    }

    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) {
      setErrorMessage(t('adminCoupons.expiryFuture'));
      return;
    }

    createCouponMutation.mutate({
      code: code.trim().toUpperCase(),
      discountPercent: discountVal,
      expiresAt: expiryDate.toISOString(),
      maxUses: maxUsesVal,
    }, {
      onSuccess: () => {
        setCode('');
        setDiscountPercent('');
        setExpiresAt('');
        setMaxUses('');
      },
      onError: (err: any) => {
        setErrorMessage(err.response?.data?.message || t('adminCoupons.failedCreate'));
      }
    });
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    toggleCouponMutation.mutate({ id, isActive: !currentStatus });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-label-caps text-xs">{t('adminCoupons.loadingPromotions')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl text-start">
      
      {/* Header */}
      <div className="border-b border-white/5 pb-lg">
        <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('adminCoupons.title')}</h1>
        <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
          {t('adminCoupons.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* Create Coupon Form (Left: 4 cols) */}
        <div className="lg:col-span-4 luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg h-fit">
          <div>
            <h3 className="font-headline-lg text-lg text-white uppercase flex items-center gap-xs">
              <Plus className="w-5 h-5 text-tertiary" /> {t('adminCoupons.generateCode')}
            </h3>
            <p className="text-[11px] text-on-surface-variant/50 font-sans mt-0.5 normal-case">{t('adminCoupons.configureCampaign')}</p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono rounded flex items-center gap-xs uppercase">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-md text-xs text-start">
            <div className="space-y-xs">
              <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminCoupons.couponCode')}</label>
              <div className="relative">
                <Tag className="absolute left-3 rtl:right-3 rtl:left-auto top-3 h-4 w-4 text-on-surface-variant/40" />
                <input
                  type="text"
                  placeholder="e.g. APEXSUMMER"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-background border border-white/10 pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 text-white uppercase rounded outline-none focus:border-tertiary font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminCoupons.discountPercentage')}</label>
              <div className="relative">
                <Percent className="absolute left-3 rtl:right-3 rtl:left-auto top-3 h-4 w-4 text-on-surface-variant/40" />
                <input
                  type="number"
                  placeholder="e.g. 15"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full bg-background border border-white/10 pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 text-white rounded outline-none focus:border-tertiary font-mono"
                  min="1"
                  max="100"
                  required
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminCoupons.expirationDate')}</label>
              <div className="relative">
                <Calendar className="absolute left-3 rtl:right-3 rtl:left-auto top-3 h-4 w-4 text-on-surface-variant/40" />
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-background border border-white/10 pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 text-white rounded outline-none focus:border-tertiary font-sans"
                  required
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminCoupons.maxRedemptions')}</label>
              <div className="relative">
                <Activity className="absolute left-3 rtl:right-3 rtl:left-auto top-3 h-4 w-4 text-on-surface-variant/40" />
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full bg-background border border-white/10 pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 text-white rounded outline-none focus:border-tertiary font-mono"
                  min="1"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createCouponMutation.isPending}
              className="w-full py-3.5 bg-tertiary text-black font-button text-xs uppercase tracking-widest rounded hover:brightness-105 transition-all flex justify-center items-center gap-xs"
            >
              {createCouponMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('adminCoupons.generateButton')}
            </button>
          </form>
        </div>

        {/* Coupons List (Right: 8 cols) */}
        <div className="lg:col-span-8 luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg text-start">
          <div>
            <h3 className="font-headline-lg text-lg text-white uppercase">{t('adminCoupons.campaignRegistries', { count: coupons.length })}</h3>
            <p className="text-[11px] text-on-surface-variant/50 font-sans mt-0.5 normal-case">{t('adminCoupons.stripeLinkedCodes')}</p>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                  <th className="py-3 text-start">{t('adminCoupons.table.code')}</th>
                  <th className="py-3 text-start">{t('adminCoupons.table.discount')}</th>
                  <th className="py-3 text-start">{t('adminCoupons.table.expiration')}</th>
                  <th className="py-3 text-start">{t('adminCoupons.table.redemptions')}</th>
                  <th className="py-3 text-start">{t('adminCoupons.table.state')}</th>
                  <th className="py-3 text-end">{t('adminCoupons.table.toggle')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
                {coupons.map((coupon) => {
                  const isExpired = new Date(coupon.expiresAt) <= new Date();
                  return (
                    <tr key={coupon.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 font-mono font-bold text-white uppercase text-start">{coupon.code}</td>
                      <td className="py-4 font-mono text-tertiary text-start">{coupon.discountPercent}% OFF</td>
                      <td className={`py-4 font-mono text-[10px] text-start ${isExpired ? 'text-red-500' : 'text-on-surface-variant'}`}>
                        {new Date(coupon.expiresAt).toLocaleDateString()} {new Date(coupon.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isExpired && <span className="text-[8px] font-label-caps ml-1.5 px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded">{t('adminCoupons.expired')}</span>}
                      </td>
                      <td className="py-4 font-mono text-start">
                        {coupon.usesCount} / <span className="text-on-surface-variant/60">{coupon.maxUses}</span>
                      </td>
                      <td className="py-4 text-start">
                        <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block ${
                          coupon.isActive && !isExpired
                            ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                            : 'bg-red-500/10 border border-red-500/20 text-red-500'
                        }`}>
                          {coupon.isActive && !isExpired ? t('adminCoupons.active') : t('adminCoupons.inactive')}
                        </span>
                      </td>
                      <td className="py-4 text-end">
                        <button
                          onClick={() => handleToggleActive(coupon.id, coupon.isActive)}
                          disabled={toggleCouponMutation.isPending}
                          className={`px-3 py-1.5 rounded text-[9px] font-label-caps border ${
                            coupon.isActive
                              ? 'border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
                              : 'border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white'
                          } transition-all`}
                        >
                          {coupon.isActive ? t('adminCoupons.deactivate') : t('adminCoupons.activate')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant/40 font-mono">
                      {t('adminCoupons.noCoupons')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
