'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Trophy,
  Share2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Crown,
  Loader2,
} from 'lucide-react';
import {
  useRetentionAnalytics,
  useLoyaltyAdminStats,
  useReferralAdminStats,
} from '../../../hooks/useLoyalty';
import { useTranslation } from '../../../providers/I18nProvider';
import { useCurrency } from '../../../providers/CurrencyProvider';

const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  trend?: { dir: 'up' | 'down'; val: string };
}) => (
  <div className="p-5 bg-white/2 border border-white/8 rounded-xl">
    <div className="flex items-start justify-between mb-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
        <Icon className="h-4 w-4 text-white/40" />
      </div>
      {trend && (
        <span className={`flex items-center gap-1 text-[10px] font-mono ${trend.dir === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend.dir === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {trend.val}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-white font-mono">{value}</p>
    <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mt-1">{label}</p>
    {sub && <p className="text-xs text-white/20 mt-0.5">{sub}</p>}
  </div>
);

const TIER_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#d4ff3f',
};

export default function RetentionAdminPage() {
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<'retention' | 'loyalty' | 'referral'>('retention');

  const { data: retention, isLoading: retLoading, refetch: refetchRetention } = useRetentionAnalytics();
  const { data: loyalty, isLoading: loyLoading, refetch: refetchLoyalty } = useLoyaltyAdminStats();
  const { data: referral, isLoading: refLoading, refetch: refetchReferral } = useReferralAdminStats();

  const isLoading = retLoading || loyLoading || refLoading;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase mb-1">{t('admin.dashboardTitle')}</p>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wide">{t('adminRetention.title')}</h1>
          <p className="text-sm text-white/30 mt-1">{t('adminRetention.desc')}</p>
        </div>
        <button
          onClick={() => { refetchRetention(); refetchLoyalty(); refetchReferral(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/50 hover:border-white/20 transition-all"
        >
          <RefreshCw className="h-3 w-3" />
          {t('admin.refresh')}
        </button>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('adminRetention.totalCustomers')}
          value={retention?.totalCustomers?.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US') ?? '—'}
          icon={Users}
        />
        <StatCard
          label={t('adminRetention.retentionRate')}
          value={`${retention?.retentionRate ?? 0}%`}
          sub={t('adminRetention.comparedToPrev30')}
          icon={TrendingUp}
          trend={{ dir: 'up', val: `${retention?.retentionRate ?? 0}%` }}
        />
        <StatCard
          label={t('adminRetention.newCustomers')}
          value={retention?.newCustomers30d?.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US') ?? '—'}
          icon={Users}
        />
        <StatCard
          label={t('adminRetention.avgOrderValue')}
          value={formatPrice(retention?.avgOrderValue || 0)}
          icon={TrendingUp}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 mb-6">
        {[
          { key: 'retention', label: t('adminRetention.tabs.retention'), icon: TrendingUp },
          { key: 'loyalty', label: t('adminRetention.tabs.loyalty'), icon: Trophy },
          { key: 'referral', label: t('adminRetention.tabs.referral'), icon: Share2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-mono tracking-widest uppercase border-b-2 transition-all -mb-px ${
              activeTab === key
                ? 'text-tertiary border-tertiary'
                : 'text-white/30 border-transparent hover:text-white/60'
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-tertiary" />
        </div>
      ) : (
        <>
          {/* ── RETENTION TAB ─────────────────────────────────────────── */}
          {activeTab === 'retention' && retention && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/2 border border-white/8 rounded-xl">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-3">{t('adminRetention.activeCustomers')}</p>
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-bold text-white font-mono">{retention.activeCustomers30d.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</p>
                    <p className="text-sm text-white/30 mb-1">/ {retention.totalCustomers.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} {t('adminRetention.total')}</p>
                  </div>
                  <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-tertiary rounded-full"
                      style={{ width: `${retention.totalCustomers > 0 ? (retention.activeCustomers30d / retention.totalCustomers) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="p-5 bg-white/2 border border-white/8 rounded-xl">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-3">{t('adminRetention.averageClv')}</p>
                  <p className="text-4xl font-bold text-white font-mono">{formatPrice(retention.avgCLV)}</p>
                  <p className="text-sm text-white/30 mt-2">{t('adminRetention.clvSpendersDesc')}</p>
                </div>
              </div>

              {/* Top Spenders table */}
              <div className="bg-white/2 border border-white/8 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 text-start">
                  <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{t('adminRetention.topSpenders')}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {retention.topSpenders.map((s, i) => (
                    <div key={s.userId} className="px-5 py-3 flex items-center gap-3">
                      <span className="text-[10px] font-mono text-white/20 w-5 text-start">{i + 1}</span>
                      <Crown className={`h-3 w-3 ${i === 0 ? 'text-yellow-400' : 'text-white/20'}`} />
                      <span className="text-xs text-white/50 font-mono flex-1 truncate text-start">{s.userId}</span>
                      <span className="text-sm font-bold text-white font-mono text-end">{formatPrice(s.totalSpend)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── LOYALTY TAB ───────────────────────────────────────────── */}
          {activeTab === 'loyalty' && loyalty && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <StatCard label={t('adminRetention.loyaltyMembers')} value={loyalty.totalAccounts.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} icon={Trophy} />
                <StatCard label={t('adminRetention.pointsIssued')} value={loyalty.totalPointsIssued.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} icon={TrendingUp} />
                <StatCard label={t('adminRetention.totalRedemptions')} value={loyalty.totalRedemptions.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} icon={Trophy} />
              </div>

              {/* Tier distribution */}
              <div className="p-5 bg-white/2 border border-white/8 rounded-xl text-start">
                <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-4">{t('adminRetention.tierDistribution')}</h3>
                <div className="space-y-3">
                  {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier) => {
                    const count = (loyalty.tierDistribution as any)[tier] ?? 0;
                    const pct = loyalty.totalAccounts > 0 ? Math.round((count / loyalty.totalAccounts) * 100) : 0;
                    const translatedTier = t(`loyalty.tier${tier}`) || tier;
                    return (
                      <div key={tier}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white/50">{translatedTier}</span>
                          <span className="text-xs font-mono text-white/40">
                            {t('adminRetention.membersCount', { count: count.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US'), pct })}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: TIER_COLORS[tier] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── REFERRAL TAB ──────────────────────────────────────────── */}
          {activeTab === 'referral' && referral && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <StatCard label={t('adminRetention.totalCodes')} value={referral.totalCodes} icon={Share2} />
                <StatCard label={t('adminRetention.totalReferrals')} value={referral.totalReferrals} icon={Users} />
                <StatCard label={t('adminRetention.converted')} value={referral.convertedReferrals} icon={TrendingUp} />
                <StatCard label={t('adminRetention.conversionRate')} value={`${referral.conversionRate}%`} icon={TrendingUp} />
              </div>

              {/* Top referrers table */}
              <div className="bg-white/2 border border-white/8 rounded-xl overflow-hidden text-start">
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{t('adminRetention.topReferrers')}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {referral.topReferrers.map((r: any, i: number) => (
                    <div key={r.id || i} className="px-5 py-3 flex items-center gap-4">
                      <span className="text-[10px] font-mono text-white/20 w-5 text-start">{i + 1}</span>
                      <div className="flex-1 text-start">
                        <p className="text-sm text-white">{r.user?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-white/30 font-mono">{r.user?.email}</p>
                      </div>
                      <span className="text-sm font-bold text-white font-mono text-end">
                        {t('adminRetention.referralsCount', { count: r.usesCount })}
                      </span>
                    </div>
                  ))}
                  {referral.topReferrers.length === 0 && (
                    <div className="px-5 py-8 text-center text-white/20 text-sm">{t('adminRetention.noReferrals')}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
