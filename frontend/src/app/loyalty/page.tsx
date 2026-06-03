'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Star,
  Zap,
  Gift,
  Share2,
  Copy,
  Check,
  ChevronRight,
  ArrowUpRight,
  Loader2,
  Crown,
  TrendingUp,
  Users,
  Sparkles,
  X,
} from 'lucide-react';
import {
  useLoyaltyAccount,
  useLoyaltyRewards,
  useRedeemReward,
  useReferralCode,
  useReferralAnalytics,
  useLoyaltyTransactions,
  LoyaltyReward,
} from '../../hooks/useLoyalty';
import { useAuthStore } from '../../store';
import { useRouter } from 'next/navigation';
import QRCode from '../../components/QRCode';
import { useTranslation } from '../../providers/I18nProvider';

// ─── Tier Config ──────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  Bronze: { color: '#cd7f32', bg: 'bg-amber-900/20', border: 'border-amber-800/30', icon: '🥉', key: 'Bronze' },
  Silver: { color: '#C0C0C0', bg: 'bg-slate-700/20', border: 'border-slate-600/30', icon: '🥈', key: 'Silver' },
  Gold: { color: '#FFD700', bg: 'bg-yellow-900/20', border: 'border-yellow-700/30', icon: '🥇', key: 'Gold' },
  Platinum: { color: '#d4ff3f', bg: 'bg-[#d4ff3f]/10', border: 'border-[#d4ff3f]/30', icon: '💎', key: 'Platinum' },
};

export default function LoyaltyPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { locale, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'history' | 'referral'>('overview');
  const [copied, setCopied] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<any>(null);

  const { data: account, isLoading: accountLoading } = useLoyaltyAccount();
  const { data: rewards = [], isLoading: rewardsLoading } = useLoyaltyRewards();
  const { data: transData } = useLoyaltyTransactions();
  const { data: referralCode } = useReferralCode();
  const { data: referralAnalytics } = useReferralAnalytics();
  const redeemMutation = useRedeemReward();

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
    }
  }, [currentUser, router]);

  if (!currentUser || accountLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-tertiary" />
      </div>
    );
  }

  const tier = account?.tier || 'Bronze';
  const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.Bronze;

  const handleCopy = () => {
    if (referralCode?.referralLink) {
      navigator.clipboard.writeText(referralCode.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRedeem = async (reward: LoyaltyReward) => {
    if (!reward.canAfford || !reward.tierEligible) return;
    setRedeemingId(reward.id);
    try {
      const result = await redeemMutation.mutateAsync(reward.id);
      setRedeemSuccess(result);
    } catch (e: any) {
      alert(e?.response?.data?.message || t('errors.redemptionFailed'));
    } finally {
      setRedeemingId(null);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US');
  };

  return (
    <main className="min-h-screen bg-[#080808] pb-24">
      {/* ── Hero Banner ────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden border-b border-white/5`} style={{ background: `linear-gradient(135deg, #0b0b0b 0%, #111 50%, #0b0b0b 100%)` }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: tierConfig.color }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Tier Badge */}
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-full border-2 ${tierConfig.border} ${tierConfig.bg} flex items-center justify-center text-4xl`}>
                {tierConfig.icon}
              </div>
              <div>
                <p className="text-[10px] font-mono text-white/30 tracking-[0.3em] uppercase mb-1">
                  {t('loyalty.title')}
                </p>
                <h1 className="text-2xl font-bold text-white uppercase tracking-wide font-display">
                  {t('loyalty.tier' + tier)}
                </h1>
                <p className="text-white/40 text-sm mt-1 font-sans">{currentUser.name}</p>
              </div>
            </div>

            {/* Points Balance */}
            <div className="text-right">
              <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase">{t('loyalty.availablePoints')}</p>
              <p className="text-5xl font-bold text-white font-mono">{formatNumber(account?.points || 0)}</p>
              <p className="text-xs text-white/30 mt-1">{t('loyalty.lifetimePoints', { count: formatNumber(account?.lifetimePoints || 0) })}</p>
            </div>
          </div>

          {/* Tier Progress Bar */}
          {account?.nextTier && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                  {t('loyalty.progressTo', { tier: t('loyalty.tier' + account.nextTier) })}
                </span>
                <span className="text-[10px] font-mono text-white/30">
                  {t('loyalty.ptsNeeded', { count: formatNumber(account.pointsNeeded) })}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${account.tierProgressPct}%`, backgroundColor: tierConfig.color }}
                />
              </div>
            </div>
          )}
          {!account?.nextTier && (
            <div className="mt-6 flex items-center gap-2 text-[#d4ff3f]">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-mono tracking-wider">{t('loyalty.maxTier')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8">
        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-white/5 mb-8">
          {[
            { key: 'overview', label: t('loyalty.tabs.overview'), icon: Trophy },
            { key: 'rewards', label: t('loyalty.tabs.rewards'), icon: Gift },
            { key: 'history', label: t('loyalty.tabs.history'), icon: TrendingUp },
            { key: 'referral', label: t('loyalty.tabs.referral'), icon: Users },
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

        {/* ══ OVERVIEW TAB ═════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tier levels */}
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-[10px] font-mono text-white/30 tracking-widest uppercase mb-4">
                {t('loyalty.membershipTiers')}
              </h2>
              {Object.entries(TIER_CONFIG).map(([tKey, cfg]) => (
                <div
                  key={tKey}
                  className={`p-4 rounded-xl border ${tKey === tier ? `${cfg.border} ${cfg.bg}` : 'border-white/5 bg-white/2'} flex items-center gap-4`}
                >
                  <span className="text-2xl">{cfg.icon}</span>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm uppercase tracking-wider ${tKey === tier ? 'text-white' : 'text-white/40'}`}>
                      {t('loyalty.tier' + tKey)}
                      {tKey === tier && <span className="ml-2 text-[9px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">{t('loyalty.current')}</span>}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {t('loyalty.ptsRange', { count: tKey === 'Bronze' ? '0' : tKey === 'Silver' ? '500' : tKey === 'Gold' ? '2,000' : '5,000' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-mono text-white/30 tracking-widest uppercase mb-4">
                {t('loyalty.earnMore')}
              </h2>
              {[
                { label: t('loyalty.shopNow'), desc: t('loyalty.shopNowDesc'), icon: Zap, href: '/shop' },
                { label: t('loyalty.referFriends'), desc: t('loyalty.referFriendsDesc'), icon: Users, href: '#', onClick: () => setActiveTab('referral') },
                { label: t('loyalty.redeemRewards'), desc: t('loyalty.redeemRewardsDesc'), icon: Gift, href: '#', onClick: () => setActiveTab('rewards') },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.onClick || undefined}
                  className="w-full flex items-center gap-3 p-4 bg-white/2 border border-white/8 rounded-xl hover:border-white/15 transition-all group text-left"
                >
                  <item.icon className="h-4 w-4 text-tertiary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-white font-semibold">{item.label}</p>
                    <p className="text-[10px] text-white/30">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/40 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ REWARDS TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'rewards' && (
          <div>
            {redeemSuccess && (
              <div className="mb-6 p-4 bg-[#d4ff3f]/10 border border-[#d4ff3f]/30 rounded-xl flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-tertiary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{t('loyalty.rewardRedeemed')}</p>
                  {redeemSuccess.couponCode && (
                    <p className="text-sm text-white/70 mt-1">
                      {t('loyalty.yourCode')} <span className="font-mono text-tertiary font-bold">{redeemSuccess.couponCode}</span>
                    </p>
                  )}
                  <button onClick={() => setRedeemSuccess(null)} className="text-[10px] text-white/30 mt-2 hover:text-white/60">{t('loyalty.dismiss')}</button>
                </div>
              </div>
            )}

            {rewardsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-tertiary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className={`p-5 rounded-xl border transition-all ${
                      reward.canAfford && reward.tierEligible
                        ? 'border-white/15 bg-white/3 hover:border-tertiary/30'
                        : 'border-white/5 bg-white/1 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-mono text-tertiary/60 uppercase tracking-wider">
                        {reward.rewardType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-white/30">
                        {t('loyalty.tierPlus', { tier: t('loyalty.tier' + reward.minTier) })}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">{reward.name}</h3>
                    <p className="text-xs text-white/40 mb-4 leading-relaxed">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-white font-mono">{t('loyalty.pointsCount', { count: formatNumber(reward.pointsCost) })}</span>
                      <button
                        onClick={() => handleRedeem(reward)}
                        disabled={!reward.canAfford || !reward.tierEligible || redeemingId === reward.id}
                        className="px-4 py-2 bg-tertiary text-black text-[10px] font-mono tracking-wider rounded-lg hover:bg-tertiary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                      >
                        {redeemingId === reward.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />}
                        {reward.canAfford && reward.tierEligible ? t('loyalty.redeem') : !reward.tierEligible ? t('loyalty.tierLocked') : t('loyalty.insufficientPts')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ HISTORY TAB ══════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div>
            <div className="divide-y divide-white/5 border border-white/8 rounded-xl overflow-hidden text-start">
              {(transData?.transactions || []).length === 0 ? (
                <div className="py-16 text-center text-white/20 text-sm">{t('loyalty.noTransactions')}</div>
              ) : (
                (transData?.transactions || []).map((tx) => (
                  <div key={tx.id} className="px-5 py-4 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${tx.points > 0 ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                      {tx.points > 0 ? '+' : '−'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white capitalize">
                        {t('loyalty.reasons.' + tx.reason, { defaultValue: tx.reason.replace(/_/g, ' ') })}
                      </p>
                      <p className="text-[10px] text-white/30 font-mono">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <span className={`text-sm font-bold font-mono ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.points > 0 ? '+' : ''}{formatNumber(tx.points)} {t('loyalty.pointsCount', { count: '' }).trim()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ REFERRAL TAB ═════════════════════════════════════════════════ */}
        {activeTab === 'referral' && (
          <div className="space-y-6">
            {/* Referral code card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white/2 border border-white/8 rounded-xl flex flex-col justify-between text-start">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Share2 className="h-5 w-5 text-tertiary" />
                    <h2 className="text-sm font-mono text-white/60 tracking-widest uppercase">{t('loyalty.referralCode')}</h2>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 bg-[#111] border border-white/10 rounded-lg px-4 py-3 font-mono text-white text-lg tracking-widest">
                      {referralCode?.code || 'Loading...'}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="px-4 py-3 bg-tertiary text-black rounded-lg text-xs font-mono tracking-wider hover:bg-tertiary/90 transition-all flex items-center gap-2 shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? t('loyalty.copied') : t('loyalty.copyLink')}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-white/30 font-sans mt-4">
                  {t('loyalty.shareLink')} <span className="text-tertiary/70 font-mono text-[11px]">{referralCode?.referralLink || 'generating...'}</span>
                </p>
              </div>

              {referralCode?.code && (
                <QRCode type="referral" value={referralCode.code} className="bg-white/2 border border-white/8 rounded-xl p-6" />
              )}
            </div>

            {/* Referral stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t('loyalty.totalReferrals'), value: formatNumber(referralAnalytics?.totalReferrals ?? 0) },
                { label: t('loyalty.converted'), value: formatNumber(referralAnalytics?.convertedReferrals ?? 0) },
                { label: t('loyalty.pointsEarned'), value: formatNumber(referralAnalytics?.totalPointsEarned ?? 0) },
              ].map((stat) => (
                <div key={stat.label} className="p-4 bg-white/2 border border-white/8 rounded-xl text-center">
                  <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div className="p-5 bg-white/2 border border-white/8 rounded-xl text-start">
              <h3 className="text-[10px] font-mono text-white/30 tracking-widest uppercase mb-4">{t('loyalty.howItWorks')}</h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: t('loyalty.howItWorksStep1') },
                  { step: '2', text: t('loyalty.howItWorksStep2') },
                  { step: '3', text: t('loyalty.howItWorksStep3') },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {item.step}
                    </span>
                    <p className="text-sm text-white/60">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
