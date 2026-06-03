'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, Activity, Users, ShieldAlert, Cpu, Check, AlertTriangle, Play, Pause } from 'lucide-react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { useToast } from '../../../providers/ToastProvider';
import { useTranslation } from '../../../providers/I18nProvider';
import { useCurrency } from '../../../providers/CurrencyProvider';

export default function SaaSAdminPage() {
  const { showToast } = useToast();
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportRes, tenantsRes] = await Promise.all([
        apiClient.get('/saas/analytics/platform'),
        apiClient.get('/saas/tenants'),
      ]);
      setReport(reportRes.data);
      setTenants(tenantsRes.data);
    } catch (err: unknown) {
      showToast(t('errors.failedLoadSaaS'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    setTogglingStatus(tenantId);
    try {
      await apiClient.put(`/saas/tenant/${tenantId}/status`, { isActive: !currentStatus });
      showToast(t('admin.statusUpdated'), 'success');
      // Update local state
      setTenants(prev =>
        prev.map(t => (t.id === tenantId ? { ...t, isActive: !currentStatus } : t))
      );
    } catch (err: unknown) {
      showToast(t('errors.failedUpdateStatus'), 'error');
    } finally {
      setTogglingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-tertiary animate-spin mb-md" />
        <p className="text-on-surface-variant text-xs uppercase tracking-wider font-label-caps">{t('admin.loadingSaaS')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl text-start font-sans">
      {/* Header */}
      <div className="border-b border-white/5 pb-lg">
        <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('admin.saasAdmin')}</h1>
        <p className="text-on-surface-variant text-sm mt-xs normal-case">
          {t('admin.saasDesc')}
        </p>
      </div>

      {/* Trajectory Stats (Glassmorphic) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl space-y-xs">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-label-caps text-[10px] tracking-wider">{t('admin.mrr')}</span>
            <DollarSign className="w-4 h-4 text-tertiary" />
          </div>
          <p className="text-2xl font-bold text-white font-display-lg">{formatPrice(report?.mrr || 0)}</p>
          <p className="text-[10px] text-tertiary font-label-caps pt-1">&bull; {t('admin.liveMmr')}</p>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl space-y-xs">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-label-caps text-[10px] tracking-wider">{t('admin.arr')}</span>
            <DollarSign className="w-4 h-4 text-tertiary" />
          </div>
          <p className="text-2xl font-bold text-white font-display-lg">{formatPrice(report?.arr || 0)}</p>
          <p className="text-[10px] text-tertiary font-label-caps pt-1">&bull; {t('admin.projectedArr')}</p>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl space-y-xs">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-label-caps text-[10px] tracking-wider">{t('admin.activeSubscriptions')}</span>
            <Users className="w-4 h-4 text-tertiary" />
          </div>
          <p className="text-2xl font-bold text-white font-display-lg">{report?.activeSubscriptionsCount || 0}</p>
          <p className="text-[10px] text-on-surface-variant/60 font-label-caps pt-1">
            {t('admin.totalStoresCount', { count: report?.totalTenants || 0 })}
          </p>
        </div>

        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl space-y-xs">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="font-label-caps text-[10px] tracking-wider">{t('admin.planSpread')}</span>
            <Activity className="w-4 h-4 text-tertiary" />
          </div>
          <div className="flex justify-between text-[11px] pt-1">
            <span>{t('admin.starterAbbrev')}: {report?.planBreakdown?.starter || 0}</span>
            <span>{t('admin.growthAbbrev')}: {report?.planBreakdown?.growth || 0}</span>
            <span>{t('admin.proAbbrev')}: {report?.planBreakdown?.pro || 0}</span>
            <span>{t('admin.enterpriseAbbrev')}: {report?.planBreakdown?.enterprise || 0}</span>
          </div>
          <p className="text-[9px] text-on-surface-variant/40 font-label-caps pt-1">
            {t('admin.starterAbbrev')} / {t('admin.growthAbbrev')} / {t('admin.proAbbrev')} / {t('admin.enterpriseAbbrev')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* Tenants List (Left: 8 cols) */}
        <div className="lg:col-span-8 space-y-lg">
          <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
            <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
              <Cpu className="w-5 h-5 text-tertiary" /> {t('admin.registeredStores')}
            </h3>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-start font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-on-surface-variant font-label-caps text-[10px] h-10">
                    <th className="pb-2 font-bold">{t('admin.storeName')}</th>
                    <th className="pb-2 font-bold">{t('admin.slugSubdomain')}</th>
                    <th className="pb-2 font-bold">{t('admin.saasPlan')}</th>
                    <th className="pb-2 font-bold text-center">{t('admin.status')}</th>
                    <th className="pb-2 font-bold text-end">{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant/50">
                        {t('admin.noStores')}
                      </td>
                    </tr>
                  ) : (
                    tenants.map((t) => (
                      <tr key={t.id} className="border-b border-white/5 h-14 hover:bg-white/[0.01]">
                        <td className="font-bold text-white uppercase">
                          {t.settings?.storeName || t.name}
                        </td>
                        <td className="font-mono text-on-surface-variant">
                          {t.subdomain}
                          {t.customDomain && (
                            <span className="block text-[10px] text-tertiary">
                              {t.customDomain}
                            </span>
                          )}
                        </td>
                        <td className="uppercase">
                          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono">
                            {t.subscription?.planCode || 'starter'}
                          </span>
                        </td>
                        <td className="text-center">
                          {t.isActive ? (
                            <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-400 font-label-caps px-2.5 py-1 rounded-full font-bold">
                              {t('admin.activeStatus')}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 font-label-caps px-2.5 py-1 rounded-full font-bold">
                              {t('admin.suspendedStatus')}
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            onClick={() => handleToggleStatus(t.id, t.isActive)}
                            disabled={togglingStatus === t.id}
                            className={`px-3 py-1.5 font-button text-[10px] rounded uppercase flex items-center gap-xs ms-auto transition-all ${
                              t.isActive
                                ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25'
                                : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/25'
                            }`}
                          >
                            {togglingStatus === t.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : t.isActive ? (
                              <><Pause className="w-3 h-3" /> {t('admin.suspend')}</>
                            ) : (
                              <><Play className="w-3 h-3" /> {t('admin.activate')}</>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Global AI Usage (Right: 4 cols) */}
        <div className="lg:col-span-4 space-y-lg">
          <section className="luxury-glass p-6 rounded-xl border border-white/5 space-y-md">
            <h3 className="font-headline-lg text-sm text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
              <ShieldAlert className="w-4 h-4 text-tertiary" /> {t('admin.aiTelemetry')}
            </h3>

            <div className="space-y-sm text-xs font-sans text-on-surface-variant">
              {report?.aiUsageAudit?.length === 0 ? (
                <p className="text-[10px] text-center text-on-surface-variant/40 py-4">{t('admin.noAiQueries')}</p>
              ) : (
                report?.aiUsageAudit?.map((usage: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white/[0.01] border border-white/5 rounded-lg space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white uppercase text-[10px]">{usage.action}</span>
                      <span className="text-[9px] font-label-caps text-tertiary">{usage.callCount} {t('admin.calls')}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-on-surface-variant/50">
                      <span>{t('admin.tokens')}: {usage.totalTokens.toLocaleString()}</span>
                      <span>{t('admin.latency')}: {usage.avgLatency}s</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
