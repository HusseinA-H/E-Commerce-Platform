'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Coins, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { useTranslation } from '../../../providers/I18nProvider';
import { useCurrency } from '../../../providers/CurrencyProvider';

interface PayoutTransaction {
  id: string;
  amount: number;
  status: string; // 'paid' | 'pending' | 'failed'
  stripePayoutId: string | null;
  createdAt: string;
}

interface PayoutSummary {
  totalPaid: number;
  pendingPayout: number;
  transactionHistory: PayoutTransaction[];
}

interface StripeStatus {
  isVerified: boolean;
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export default function VendorPayouts() {
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutSummary | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [payoutsRes, statusRes] = await Promise.all([
        apiClient.get('/vendor/payouts'),
        apiClient.get('/vendor/status')
      ]);
      setPayouts(payoutsRes.data);
      setStripeStatus(statusRes.data);
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOnboard = async () => {
    setOnboardLoading(true);
    setErrorMsg('');
    try {
      const refreshUrl = window.location.href;
      const returnUrl = window.location.href;
      const res = await apiClient.post('/vendor/onboard', { refreshUrl, returnUrl });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
      setOnboardLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-md">
        <Loader2 className="h-8 w-8 text-tertiary animate-spin" />
        <span className="text-sm text-on-surface-variant font-semibold">
          {t('vendor.loadingPayouts')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-xl text-start">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-md">
        <div>
          <h1 className="font-display-lg text-2xl text-white uppercase font-black">
            {t('vendor.stripePayouts')}
          </h1>
          <p className="text-on-surface-variant text-xs mt-xs">
            {t('vendor.stripePayoutsDesc')}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 border border-outline-variant rounded hover:bg-white/5 transition-all text-on-surface-variant hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded">
          {errorMsg}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl items-start font-sans">
        
        {/* Ledger & Onboarding status cards */}
        <div className="lg:col-span-2 space-y-lg">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            {/* Total paid */}
            <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-sm">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-[10px] text-on-surface-variant">{t('vendor.totalTransferred')}</span>
                <Coins className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-white">{payouts ? formatPrice(payouts.totalPaid) : formatPrice(0)}</p>
              <p className="text-[10px] text-on-surface-variant">
                {t('vendor.transferredDesc')}
              </p>
            </div>

            {/* Pending ledger */}
            <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-sm">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-[10px] text-on-surface-variant">{t('vendor.pendingLedger')}</span>
                <Clock className="h-4 w-4 text-tertiary" />
              </div>
              <p className="text-3xl font-black text-white">{payouts ? formatPrice(payouts.pendingPayout) : formatPrice(0)}</p>
              <p className="text-[10px] text-on-surface-variant">
                {t('vendor.pendingDesc')}
              </p>
            </div>
          </div>

          {/* Ledger History List */}
          <div className="luxury-glass rounded-xl border border-outline-variant overflow-hidden">
            <div className="p-5 border-b border-outline-variant">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                {t('vendor.payoutsHistory')}
              </h3>
            </div>

            {!payouts || payouts.transactionHistory.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant space-y-xs">
                <Info className="h-8 w-8 text-white/10 mx-auto" />
                <p className="text-xs">{t('vendor.noPayouts')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-label-caps text-on-surface-variant uppercase bg-white/[0.01]">
                      <th className="p-4 font-bold text-start">{t('vendor.txRef')}</th>
                      <th className="p-4 font-bold text-start">{t('vendor.txDate')}</th>
                      <th className="p-4 font-bold text-start">{t('vendor.txAmount')}</th>
                      <th className="p-4 font-bold text-start">{t('vendor.txStatus')}</th>
                      <th className="p-4 font-bold text-start">{t('vendor.stripeTxId')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payouts.transactionHistory.map((tx) => {
                      const dateStr = new Date(tx.createdAt).toLocaleDateString(
                        locale === 'ar' ? 'ar-EG' : 'en-US',
                        { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                      );

                      return (
                        <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4 font-mono text-[10px] font-bold text-white uppercase text-start">
                            TX-{tx.id.slice(-8).toUpperCase()}
                          </td>
                          <td className="p-4 text-on-surface-variant text-start">{dateStr}</td>
                          <td className="p-4 font-bold text-white text-start">{formatPrice(tx.amount)}</td>
                          <td className="p-4 text-start">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold font-label-caps px-2 py-0.5 rounded ${
                              tx.status === 'paid'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/10'
                                : tx.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/10'
                                : 'bg-red-500/20 text-red-400 border border-red-500/10'
                            }`}>
                              {tx.status === 'paid' && <CheckCircle className="h-2.5 w-2.5" />}
                              {tx.status === 'pending' && <Clock className="h-2.5 w-2.5 animate-pulse" />}
                              {tx.status === 'failed' && <XCircle className="h-2.5 w-2.5" />}
                              {tx.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-[10px] text-on-surface-variant select-all text-start">
                            {tx.stripePayoutId || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Stripe Connect account details sidebar */}
        <div className="space-y-lg">
          <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-md">
            <h3 className="font-bold text-sm text-white uppercase border-b border-outline-variant pb-2">
              {t('vendor.stripeProfile')}
            </h3>

            {stripeStatus ? (
              <div className="space-y-md text-xs">
                {/* Account Status Badge */}
                <div className="flex justify-between items-center py-xs border-b border-white/5">
                  <span className="text-on-surface-variant">{t('vendor.txStatus')}</span>
                  <span className={`font-bold font-label-caps px-2 py-0.5 rounded border text-[9px] ${
                    stripeStatus.isVerified
                      ? 'bg-green-500/20 border-green-500/10 text-green-400'
                      : 'bg-yellow-500/20 border-yellow-500/10 text-yellow-500'
                  }`}>
                    {stripeStatus.status.toUpperCase()}
                  </span>
                </div>

                {/* Checklist of Stripe requirements */}
                <div className="space-y-sm pt-xs text-on-surface-variant text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>{t('vendor.identitySubmitted')}</span>
                    {stripeStatus.detailsSubmitted ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('vendor.chargesActive')}</span>
                    {stripeStatus.chargesEnabled ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('vendor.payoutsAllowed')}</span>
                    {stripeStatus.payoutsEnabled ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Action button if onboarding incomplete */}
                {!stripeStatus.isVerified && (
                  <div className="pt-md border-t border-white/5 space-y-sm">
                    <p className="text-[11px] leading-relaxed text-on-surface-variant">
                      {t('vendor.onboardingNotice')}
                    </p>
                    <button
                      onClick={handleOnboard}
                      disabled={onboardLoading}
                      className="w-full bg-tertiary text-on-tertiary hover:opacity-90 py-2.5 rounded font-button text-[11px] uppercase font-bold transition-all flex items-center justify-center gap-xs"
                    >
                      {onboardLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          {t('vendor.completeOnboarding')}
                          <ExternalLink className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {stripeStatus.isVerified && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-lg p-3 text-[11px] leading-relaxed">
                    {t('vendor.verifiedNotice')}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">{t('vendor.noStripeStatus')}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
