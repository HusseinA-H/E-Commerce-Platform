'use client';

import React, { useState } from 'react';
import { useAiTelemetryQuery } from '../../../hooks/useAdmin';
import { 
  Cpu, 
  DollarSign, 
  TrendingUp, 
  Zap, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Activity, 
  RefreshCw, 
  Database,
  Terminal
} from 'lucide-react';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AiTelemetryDashboard() {
  const { t } = useTranslation();
  const { data: telemetry, isLoading, isFetching, refetch } = useAiTelemetryQuery();
  const [selectedView, setSelectedView] = useState<'actions' | 'models'>('actions');

  if (isLoading || !telemetry) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <div className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-label-caps text-xs tracking-widest">{t('adminAiTelemetry.connectingShell')}</p>
      </div>
    );
  }

  const kpis = [
    {
      label: t('adminAiTelemetry.kpis.totalExecutions'),
      value: telemetry.totalRequests.toLocaleString(),
      icon: Activity,
      subtext: t('adminAiTelemetry.kpis.totalExecutionsSub'),
      color: 'text-tertiary',
      borderColor: 'border-tertiary/10',
      bgColor: 'bg-tertiary/5'
    },
    {
      label: t('adminAiTelemetry.kpis.accumulatedSpend'),
      value: `$${telemetry.totalCostUsd.toFixed(4)}`,
      icon: DollarSign,
      subtext: t('adminAiTelemetry.kpis.accumulatedSpendSub'),
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/10',
      bgColor: 'bg-emerald-500/5'
    },
    {
      label: t('adminAiTelemetry.kpis.tokensConsumed'),
      value: telemetry.totalTokens >= 1000000 
        ? `${(telemetry.totalTokens / 1000000).toFixed(2)}M` 
        : telemetry.totalTokens.toLocaleString(),
      icon: Cpu,
      subtext: t('adminAiTelemetry.kpis.tokensConsumedSub'),
      color: 'text-indigo-400',
      borderColor: 'border-indigo-500/10',
      bgColor: 'bg-indigo-500/5'
    },
    {
      label: t('adminAiTelemetry.kpis.cacheBypass'),
      value: `${telemetry.cacheHitRate}%`,
      icon: Database,
      subtext: t('adminAiTelemetry.kpis.cacheBypassSub', { count: telemetry.cacheHits }),
      color: 'text-blue-400',
      borderColor: 'border-blue-500/10',
      bgColor: 'bg-blue-500/5'
    },
    {
      label: t('adminAiTelemetry.kpis.meanLatency'),
      value: `${telemetry.averageLatencySeconds}s`,
      icon: Clock,
      subtext: t('adminAiTelemetry.kpis.meanLatencySub'),
      color: 'text-amber-400',
      borderColor: 'border-amber-500/10',
      bgColor: 'bg-amber-500/5'
    },
    {
      label: t('adminAiTelemetry.kpis.stabilityIndex'),
      value: `${telemetry.successRate}%`,
      icon: telemetry.failureCount > 0 ? AlertTriangle : Zap,
      subtext: t('adminAiTelemetry.kpis.stabilityIndexSub', { count: telemetry.failureCount }),
      color: telemetry.failureCount > 0 ? 'text-rose-400' : 'text-cyan-400',
      borderColor: telemetry.failureCount > 0 ? 'border-rose-500/20' : 'border-cyan-500/10',
      bgColor: telemetry.failureCount > 0 ? 'bg-rose-500/5' : 'bg-cyan-500/5'
    }
  ];

  // Helper to find the maximum values for drawing SVG bar charts
  const maxActionTokens = Math.max(...telemetry.metricsByAction.map((a: any) => a.tokens), 1);
  const maxModelCost = Math.max(...telemetry.metricsByModel.map((m: any) => m.cost), 0.0001);

  return (
    <div className="space-y-xl">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <div className="flex items-center gap-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
            <span className="text-[10px] font-label-caps text-tertiary tracking-widest font-mono">{t('adminAiTelemetry.systemOverwatch')}</span>
          </div>
          <h1 className="font-display-lg text-4xl text-white uppercase tracking-tight mt-xs">{t('adminAiTelemetry.title')}</h1>
          <p className="text-on-surface-variant text-sm max-w-2xl leading-relaxed mt-xs">
            {t('adminAiTelemetry.desc')}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-sm px-5 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-lg text-white font-button text-xs uppercase tracking-wider transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? t('adminAiTelemetry.refreshingLogs') : t('adminAiTelemetry.refreshTelemetry')}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className={`luxury-glass p-6 rounded-xl border ${kpi.borderColor} relative overflow-hidden flex flex-col justify-between h-40`}
            >
              {/* Subtle background glow */}
              <div className={`absolute top-0 right-0 rtl:left-0 rtl:right-auto w-24 h-24 rounded-full filter blur-3xl opacity-10 ${kpi.bgColor}`} />
              
              <div className="flex justify-between items-start relative z-10">
                <span className="font-label-caps text-[10px] text-on-surface-variant/50 tracking-wider">{kpi.label}</span>
                <div className={`p-2 rounded-lg bg-white/[0.02] border border-white/5 ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-xs relative z-10">
                <h2 className="text-3xl font-display-lg text-white tracking-tight">{kpi.value}</h2>
                <p className="text-[10px] font-mono text-on-surface-variant/40 uppercase">
                  {kpi.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* SVG Visualization & Detail panel */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* Visual Charts Card */}
        <div className="lg:col-span-7 luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
              <h3 className="font-headline-lg text-sm text-white uppercase tracking-wider">{t('adminAiTelemetry.charts.usageDistribution')}</h3>
              <p className="text-[10px] text-on-surface-variant/40 mt-1">{t('adminAiTelemetry.charts.ratioDesc')}</p>
            </div>
            <div className="flex bg-white/[0.02] border border-white/5 p-0.5 rounded-lg">
              <button
                onClick={() => setSelectedView('actions')}
                className={`px-3 py-1.5 rounded-md text-[9px] font-label-caps uppercase transition-all ${
                  selectedView === 'actions' ? 'bg-tertiary text-black font-bold' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                {t('adminAiTelemetry.charts.byAction')}
              </button>
              <button
                onClick={() => setSelectedView('models')}
                className={`px-3 py-1.5 rounded-md text-[9px] font-label-caps uppercase transition-all ${
                  selectedView === 'models' ? 'bg-tertiary text-black font-bold' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                {t('adminAiTelemetry.charts.byModel')}
              </button>
            </div>
          </div>

          {/* SVG Graphs content */}
          <div className="flex-1 py-4 flex flex-col justify-center min-h-[250px]">
            {selectedView === 'actions' ? (
              <div className="space-y-md">
                {telemetry.metricsByAction.map((act: any, idx: number) => {
                  const pct = Math.max(10, (act.tokens / maxActionTokens) * 100);
                  const colors = ['bg-tertiary', 'bg-indigo-400', 'bg-blue-400', 'bg-amber-400', 'bg-cyan-400'];
                  const colorClass = colors[idx % colors.length];
                  
                  return (
                    <div key={act.action} className="space-y-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-white uppercase font-bold">{act.action.replace('-', ' ').replace('_', ' ')}</span>
                        <span className="text-on-surface-variant/60">
                          {act.tokens.toLocaleString()} {t('admin.tokens').toLowerCase()} | ${act.cost.toFixed(4)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.02] border border-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {telemetry.metricsByAction.length === 0 && (
                  <p className="text-center font-mono text-[10px] text-on-surface-variant/40 py-10">{t('adminAiTelemetry.charts.noActions')}</p>
                )}
              </div>
            ) : (
              <div className="space-y-md">
                {telemetry.metricsByModel.map((model: any, idx: number) => {
                  const pct = Math.max(10, (model.cost / maxModelCost) * 100);
                  const colors = ['bg-emerald-400', 'bg-purple-400', 'bg-rose-400', 'bg-cyan-400'];
                  const colorClass = colors[idx % colors.length];

                  return (
                    <div key={model.model} className="space-y-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-white uppercase font-bold">{model.model}</span>
                        <span className="text-on-surface-variant/60">
                          {model.count} {t('admin.calls')} | ${model.cost.toFixed(4)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.02] border border-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {telemetry.metricsByModel.length === 0 && (
                  <p className="text-center font-mono text-[10px] text-on-surface-variant/40 py-10">{t('adminAiTelemetry.charts.noModels')}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-label-caps text-on-surface-variant/30">
            <span>{t('adminAiTelemetry.charts.metricUnit')}</span>
            <span>{t('adminAiTelemetry.charts.systemType')}</span>
          </div>
        </div>

        {/* Action Performance Logs */}
        <div className="lg:col-span-5 luxury-glass p-6 rounded-xl border border-white/5 flex flex-col justify-between min-h-[350px]">
          <div className="space-y-md overflow-hidden flex flex-col h-full w-full">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0">
              <h3 className="font-headline-lg text-xs text-white uppercase flex items-center gap-xs">
                <Terminal className="w-3.5 h-3.5 text-tertiary" /> {t('adminAiTelemetry.latencyLogs.title')}
              </h3>
              <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20 text-tertiary">
                {t('adminAiTelemetry.latencyLogs.countOps', { count: telemetry.metricsByAction.length })}
              </span>
            </div>
            
            <div className="space-y-sm overflow-y-auto no-scrollbar flex-1 pr-1 pt-2">
              {telemetry.metricsByAction.map((act: any) => {
                let latencyColor = 'text-green-400 bg-green-500/5 border-green-500/10';
                if (act.latency > 5.0) {
                  latencyColor = 'text-rose-400 bg-rose-500/5 border-rose-500/10';
                } else if (act.latency > 2.0) {
                  latencyColor = 'text-amber-400 bg-amber-500/5 border-amber-500/10';
                }

                return (
                  <div key={act.action} className="p-3 bg-white/[0.01] border border-white/5 rounded-lg flex justify-between items-center font-sans text-xs">
                    <div className="space-y-1 text-start">
                      <p className="text-white font-bold text-[10px] uppercase font-mono">{act.action.replace('-', ' ').replace('_', ' ')}</p>
                      <p className="text-on-surface-variant/40 text-[9px] font-mono">{t('adminAiTelemetry.tables.runs')}: {act.count}</p>
                    </div>
                    <div className="text-end space-y-1 shrink-0">
                      <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded border inline-block ${latencyColor}`}>
                        {act.latency.toFixed(2)}s avg
                      </span>
                    </div>
                  </div>
                );
              })}
              {telemetry.metricsByAction.length === 0 && (
                <div className="py-10 text-center text-on-surface-variant/40 font-mono text-[10px]">
                  {t('adminAiTelemetry.latencyLogs.noIncidents')}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Grid of details tables */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Actions telemetry log table */}
        <div className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md">
          <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-sm">{t('adminAiTelemetry.tables.actionCosts')}</h3>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                  <th className="py-3 text-start">{t('adminAiTelemetry.tables.actionId')}</th>
                  <th className="py-3 text-end">{t('adminAiTelemetry.tables.runs')}</th>
                  <th className="py-3 text-end">{t('adminAiTelemetry.tables.tokens')}</th>
                  <th className="py-3 text-end">{t('adminAiTelemetry.tables.latency')}</th>
                  <th className="py-3 text-end">{t('adminAiTelemetry.tables.cost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px] text-on-surface-variant">
                {telemetry.metricsByAction.map((act: any) => (
                  <tr key={act.action} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3.5 text-white font-bold uppercase text-start">{act.action.replace('-', ' ').replace('_', ' ')}</td>
                    <td className="py-3.5 text-end">{act.count}</td>
                    <td className="py-3.5 text-end">{act.tokens.toLocaleString()}</td>
                    <td className="py-3.5 text-end text-amber-400">{act.latency.toFixed(2)}s</td>
                    <td className="py-3.5 text-end text-emerald-400">${act.cost.toFixed(4)}</td>
                  </tr>
                ))}
                {telemetry.metricsByAction.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-on-surface-variant/40">{t('adminAiTelemetry.tables.noMetrics')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Models telemetry log table */}
        <div className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md">
          <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-sm">{t('adminAiTelemetry.tables.modelAllocations')}</h3>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                  <th className="py-3 text-start">{t('adminAiTelemetry.tables.llmEngine')}</th>
                  <th className="py-3 text-end">{t('adminAiTelemetry.tables.executions')}</th>
                  <th className="py-3 text-end">{t('adminAiTelemetry.tables.tokens')}</th>
                  <th className="py-3 text-end">{t('adminAiTelemetry.tables.cost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px] text-on-surface-variant">
                {telemetry.metricsByModel.map((model: any) => (
                  <tr key={model.model} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3.5 text-white font-bold text-start">{model.model}</td>
                    <td className="py-3.5 text-end">{model.count}</td>
                    <td className="py-3.5 text-end">{model.tokens.toLocaleString()}</td>
                    <td className="py-3.5 text-end text-emerald-400">${model.cost.toFixed(4)}</td>
                  </tr>
                ))}
                {telemetry.metricsByModel.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-on-surface-variant/40">{t('adminAiTelemetry.tables.noModelRuns')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
