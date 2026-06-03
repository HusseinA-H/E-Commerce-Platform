'use client';

import React, { useState } from 'react';
import { useProductsQuery } from '../../../hooks/useProducts';
import { useBulkStockMutation } from '../../../hooks/useAdmin';
import { Loader2, AlertTriangle, CheckCircle, PackageOpen, Check, Save } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../providers/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: products = [], isLoading } = useProductsQuery();
  const bulkStockMutation = useBulkStockMutation();
  const { locale, t } = useTranslation();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [editingRows, setEditingRows] = useState<Record<string, { stockQuantity: number; lowStockThreshold: number; sku: string; barcode: string }>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStockVal, setBulkStockVal] = useState<string>('');

  const handleEditChange = (productId: string, field: string, value: any) => {
    const current = editingRows[productId] || {
      stockQuantity: products.find(p => p.id === productId)?.stockQuantity || 0,
      lowStockThreshold: products.find(p => p.id === productId)?.lowStockThreshold || 5,
      sku: products.find(p => p.id === productId)?.sku || '',
      barcode: products.find(p => p.id === productId)?.barcode || '',
    };
    setEditingRows({
      ...editingRows,
      [productId]: {
        ...current,
        [field]: value,
      },
    });
  };

  const handleSaveRow = async (productId: string) => {
    const row = editingRows[productId];
    if (!row) return;

    try {
      // Direct patch call to update product parameters
      await apiClient.patch(`/products/${productId}`, {
        stock: row.stockQuantity, // sync legacy
        stockQuantity: row.stockQuantity,
        lowStockThreshold: row.lowStockThreshold,
        sku: row.sku || null,
        barcode: row.barcode || null,
      });

      // Update inventory status local cache invalidation
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] });
      
      const newEditing = { ...editingRows };
      delete newEditing[productId];
      setEditingRows(newEditing);

      showToast(t('adminInventory.toast.saved'), 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || t('errors.failedLoadSettings'), 'error');
    }
  };

  const handleBulkStockSubmit = () => {
    if (selectedIds.length === 0) {
      showToast(t('adminInventory.toast.selectFirst'), 'error');
      return;
    }
    const val = parseInt(bulkStockVal);
    if (isNaN(val) || val < 0) {
      showToast(t('adminInventory.toast.validQty'), 'error');
      return;
    }

    const updates = selectedIds.map(id => ({
      id,
      stockQuantity: val,
    }));

    bulkStockMutation.mutate(updates, {
      onSuccess: () => {
        setSelectedIds([]);
        setBulkStockVal('');
        showToast(t('adminInventory.toast.saved'), 'success');
      }
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredProducts: any[]) => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  // Filter products by inventory status
  const filteredProducts = products.filter(p => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'OUT_OF_STOCK') return p.stockQuantity === 0;
    if (filterStatus === 'LOW_STOCK') return p.stockQuantity! > 0 && p.stockQuantity! <= p.lowStockThreshold!;
    if (filterStatus === 'IN_STOCK') return p.stockQuantity! > p.lowStockThreshold!;
    return true;
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-label-caps text-xs">{t('adminInventory.loadingMetrics')}</p>
      </div>
    );
  }

  const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;
  const lowStockCount = products.filter(p => p.stockQuantity! > 0 && p.stockQuantity! <= p.lowStockThreshold!).length;

  return (
    <div className="space-y-xl text-start">
      {/* Header */}
      <div className="border-b border-white/5 pb-lg flex flex-col md:flex-row md:justify-between md:items-end gap-md">
        <div>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('adminInventory.title')}</h1>
          <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
            {t('adminInventory.desc')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-xs">
          {['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].map(status => {
            const isActive = filterStatus === status;
            return (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 text-[10px] font-label-caps border rounded-lg transition-all ${
                  isActive
                    ? 'bg-tertiary text-black border-tertiary font-bold'
                    : 'text-on-surface-variant border-white/5 hover:border-white/10 hover:text-white bg-white/[0.01]'
                }`}
              >
                {status === 'ALL' ? t('adminInventory.all') : status === 'IN_STOCK' ? t('adminInventory.inStock') : status === 'LOW_STOCK' ? t('adminInventory.lowStock') : t('adminInventory.depleted')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
        <div className="luxury-glass p-6 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="space-y-xs">
            <span className="font-label-caps text-[9px] text-on-surface-variant/60">{t('adminInventory.totalCatalog')}</span>
            <h2 className="text-white text-2xl font-display-lg">{formatNumber(products.length)}</h2>
          </div>
          <PackageOpen className="h-8 w-8 text-white/20" />
        </div>
        <div className="luxury-glass p-6 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="space-y-xs">
            <span className="font-label-caps text-[9px] text-on-surface-variant/60">{t('adminInventory.lowStockAlerts')}</span>
            <h2 className="text-yellow-400 text-2xl font-display-lg">{formatNumber(lowStockCount)}</h2>
          </div>
          <AlertTriangle className="h-8 w-8 text-yellow-500/30" />
        </div>
        <div className="luxury-glass p-6 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="space-y-xs">
            <span className="font-label-caps text-[9px] text-on-surface-variant/60">{t('adminInventory.depletedStock')}</span>
            <h2 className="text-red-500 text-2xl font-display-lg">{formatNumber(outOfStockCount)}</h2>
          </div>
          <AlertTriangle className="h-8 w-8 text-red-500/30" />
        </div>
      </div>

      {/* Bulk stock adjuster panel */}
      {selectedIds.length > 0 && (
        <section className="bg-tertiary/5 border border-tertiary/10 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md animate-fade-in">
          <div>
            <h4 className="font-bold text-white text-xs uppercase">{t('adminInventory.selectedCount', { count: formatNumber(selectedIds.length) })}</h4>
            <p className="text-[11px] text-on-surface-variant font-sans normal-case mt-0.5">{t('adminInventory.batchDesc')}</p>
          </div>
          <div className="flex gap-sm items-center">
            <input
              type="number"
              placeholder={t('adminInventory.setStock')}
              value={bulkStockVal}
              onChange={(e) => setBulkStockVal(e.target.value)}
              className="bg-background border border-white/10 px-3 py-2 text-white text-xs rounded outline-none w-36 focus:border-tertiary"
            />
            <button
              onClick={handleBulkStockSubmit}
              disabled={bulkStockMutation.isPending}
              className="px-4 py-2 bg-tertiary text-black font-button text-[10px] uppercase rounded hover:brightness-105 transition-all flex items-center gap-xs"
            >
              {bulkStockMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {t('adminInventory.applyBulk')}
            </button>
          </div>
        </section>
      )}

      {/* Grid / Table */}
      <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                <th className="py-3 pl-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={() => toggleSelectAll(filteredProducts)}
                    className="rounded border-white/10 bg-background text-tertiary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="py-3">{t('adminInventory.table.product')}</th>
                <th className="py-3">{t('adminInventory.table.skuCode')}</th>
                <th className="py-3">{t('adminInventory.table.barcode')}</th>
                <th className="py-3">{t('adminInventory.table.stockQty')}</th>
                <th className="py-3">{t('adminInventory.table.reservedStock')}</th>
                <th className="py-3">{t('adminInventory.table.minThreshold')}</th>
                <th className="py-3">{t('adminInventory.table.status')}</th>
                <th className="py-3 text-right">{t('adminInventory.table.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
              {filteredProducts.map(product => {
                const isSelected = selectedIds.includes(product.id);
                const edited = editingRows[product.id];
                
                const stockVal = edited !== undefined ? edited.stockQuantity : (product.stockQuantity ?? 0);
                const thresholdVal = edited !== undefined ? edited.lowStockThreshold : (product.lowStockThreshold ?? 5);
                const skuVal = edited !== undefined ? edited.sku : (product.sku ?? '');
                const barcodeVal = edited !== undefined ? edited.barcode : (product.barcode ?? '');
                
                const isDirty = edited !== undefined;

                // status indicator
                let statusBadge = (
                  <span className="text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block bg-green-500/10 border border-green-500/20 text-green-500">
                    {t('adminInventory.inStock')}
                  </span>
                );
                if (stockVal === 0) {
                  statusBadge = (
                    <span className="text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block bg-red-500/10 border border-red-500/20 text-red-500">
                      {t('adminInventory.depleted')}
                    </span>
                  );
                } else if (stockVal <= thresholdVal) {
                  statusBadge = (
                    <span className="text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                      {t('adminInventory.lowStock')}
                    </span>
                  );
                }

                return (
                  <tr key={product.id} className={`hover:bg-white/[0.01] transition-colors ${isSelected ? 'bg-white/[0.01]' : ''}`}>
                    <td className="py-4 pl-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        className="rounded border-white/10 bg-background text-tertiary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-4">
                      <h4 className="font-bold text-white uppercase">{product.name}</h4>
                      <p className="text-[9px] text-on-surface-variant/40 font-mono mt-0.5 uppercase">{product.category}</p>
                    </td>
                    <td className="py-4 font-mono">
                      <input
                        type="text"
                        value={skuVal}
                        placeholder="SKU-XXXX"
                        onChange={(e) => handleEditChange(product.id, 'sku', e.target.value)}
                        className="bg-transparent border-b border-transparent focus:border-white/20 outline-none w-28 py-0.5 text-white font-mono text-xs uppercase"
                      />
                    </td>
                    <td className="py-4 font-mono">
                      <input
                        type="text"
                        value={barcodeVal}
                        placeholder="Barcode"
                        onChange={(e) => handleEditChange(product.id, 'barcode', e.target.value)}
                        className="bg-transparent border-b border-transparent focus:border-white/20 outline-none w-28 py-0.5 text-white font-mono text-xs"
                      />
                    </td>
                    <td className="py-4">
                      <input
                        type="number"
                        min="0"
                        value={stockVal}
                        onChange={(e) => handleEditChange(product.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                        className="bg-transparent border-b border-transparent focus:border-white/20 outline-none w-16 py-0.5 text-white font-bold text-xs"
                      />
                    </td>
                    <td className="py-4 font-mono text-center text-white/60">
                      {formatNumber(product.reservedStock ?? 0)}
                    </td>
                    <td className="py-4">
                      <input
                        type="number"
                        min="0"
                        value={thresholdVal}
                        onChange={(e) => handleEditChange(product.id, 'lowStockThreshold', parseInt(e.target.value) || 0)}
                        className="bg-transparent border-b border-transparent focus:border-white/20 outline-none w-16 py-0.5 text-white font-mono text-xs"
                      />
                    </td>
                    <td className="py-4">{statusBadge}</td>
                    <td className="py-4 text-right pr-3">
                      {isDirty ? (
                        <button
                          onClick={() => handleSaveRow(product.id)}
                          className="px-2.5 py-1.5 bg-tertiary text-black text-[9px] font-label-caps font-bold rounded flex items-center gap-xs hover:brightness-105 ml-auto cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> {t('profile.save')}
                        </button>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant/30 italic font-mono">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant/40 font-mono">
                    {t('adminInventory.noProducts')}
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
