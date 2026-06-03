'use client';

import React, { useState } from 'react';
import { useAuditLogsQuery } from '../../../hooks/useAdmin';
import { Loader2, ShieldCheck, Search, Database, Clock, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminAuditLogsPage() {
  const { t } = useTranslation();
  const { data: logs = [], isLoading, refetch, isRefetching } = useAuditLogsQuery();
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(log => {
    const searchLower = search.toLowerCase();
    const actionMatch = log.action?.toLowerCase().includes(searchLower);
    const entityTypeMatch = log.entityType?.toLowerCase().includes(searchLower);
    const userMatch = log.user?.name?.toLowerCase().includes(searchLower) || log.user?.email?.toLowerCase().includes(searchLower);
    const idMatch = log.entityId?.toLowerCase().includes(searchLower) || log.id?.toLowerCase().includes(searchLower);
    return actionMatch || entityTypeMatch || userMatch || idMatch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-label-caps text-xs">{t('adminAuditLogs.loadingArchive')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl text-start">
      
      {/* Header */}
      <div className="border-b border-white/5 pb-lg flex flex-col sm:flex-row sm:justify-between sm:items-end gap-md">
        <div>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('adminAuditLogs.title')}</h1>
          <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
            {t('adminAuditLogs.desc')}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="px-4 py-2 border border-white/10 rounded-lg text-[10px] font-label-caps hover:border-white/20 text-white bg-white/[0.01] hover:bg-white/[0.02] active:scale-[0.98] transition-all flex items-center gap-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          {t('adminAuditLogs.refreshDb')}
        </button>
      </div>

      {/* Search Input bar */}
      <div className="relative">
        <Search className="absolute left-4 rtl:right-4 rtl:left-auto top-3.5 h-5 w-5 text-on-surface-variant/40" />
        <input
          type="text"
          placeholder={t('adminAuditLogs.filterLogsPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-low border border-white/5 pl-12 pr-4 rtl:pr-12 rtl:pl-4 py-3.5 text-xs text-white uppercase placeholder-on-surface-variant/30 rounded-xl outline-none focus:border-white/10 font-mono tracking-wide"
        />
      </div>

      {/* Audit Log Table */}
      <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
        <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
          <Database className="w-5 h-5 text-tertiary" /> {t('adminAuditLogs.auditableIncidents', { count: filteredLogs.length })}
        </h3>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                <th className="py-3 pl-3 rtl:pr-3 rtl:pl-0 text-start">{t('adminAuditLogs.table.datetime')}</th>
                <th className="py-3 text-start">{t('adminAuditLogs.table.operator')}</th>
                <th className="py-3 text-start">{t('adminAuditLogs.table.action')}</th>
                <th className="py-3 text-start">{t('adminAuditLogs.table.entityTarget')}</th>
                <th className="py-3 text-start">{t('adminAuditLogs.table.entityIdentifier')}</th>
                <th className="py-3 text-end pr-3 rtl:pl-3 rtl:pr-0">{t('adminAuditLogs.table.parameters')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
              {filteredLogs.map((log) => {
                let parsedDetails = {};
                try {
                  parsedDetails = log.details ? JSON.parse(log.details) : {};
                } catch {
                  parsedDetails = { raw: log.details };
                }

                return (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 pl-3 rtl:pr-3 rtl:pl-0 font-mono text-[10px] text-white/70 flex items-center gap-xs">
                      <Clock className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </td>
                    <td className="py-4">
                      {log.user ? (
                        <div>
                          <span className="font-bold text-white uppercase">{log.user.name}</span>
                          <p className="text-[9px] text-on-surface-variant/50 font-mono mt-0.5">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-[9px] font-label-caps text-tertiary bg-tertiary/10 border border-tertiary/20 px-1.5 py-0.5 rounded">{t('adminAuditLogs.systemAutomation')}</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block ${
                        log.action.includes('FAIL') || log.action.includes('CANCEL') || log.action.includes('DELETE')
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                          : log.action.includes('SUCCEED') || log.action.includes('CONFIRM') || log.action.includes('RESTORE') || log.action.includes('REFUND')
                          ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                          : 'bg-white/5 border border-white/10 text-white/70'
                      }`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-[9px] font-label-caps px-1.5 py-0.5 bg-white/5 border border-white/10 text-on-surface-variant rounded">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-[10px] text-white/60">
                      {log.entityId || 'N/A'}
                    </td>
                    <td className="py-4 text-end pr-3 rtl:pl-3 rtl:pr-0 font-mono text-[9px] max-w-xs truncate text-on-surface-variant/60 hover:text-white transition-colors cursor-help" title={JSON.stringify(parsedDetails, null, 2)}>
                      {JSON.stringify(parsedDetails)}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-on-surface-variant/40 font-mono">
                    {t('adminAuditLogs.noIncidents')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
