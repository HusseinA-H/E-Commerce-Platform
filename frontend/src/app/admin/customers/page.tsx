'use client';

import React from 'react';
import { useAdminUsersQuery, useUpdateUserRoleMutation, useDeleteUserMutation } from '../../../hooks/useAdmin';
import { Loader2, Trash2, Shield, User } from 'lucide-react';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminCustomersPage() {
  const { t } = useTranslation();
  const { data: users = [], isLoading } = useAdminUsersQuery();
  const updateRoleMutation = useUpdateUserRoleMutation();
  const deleteUserMutation = useDeleteUserMutation();

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ id: userId, role });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm(t('adminCustomers.deleteConfirm'))) {
      deleteUserMutation.mutate(userId);
    }
  };

  const getRoleTranslation = (role: string) => {
    switch (role) {
      case 'customer': return t('adminCustomers.customer');
      case 'support_agent': return t('adminCustomers.supportAgent');
      case 'inventory_manager': return t('adminCustomers.inventoryManager');
      case 'admin': return t('adminCustomers.admin');
      case 'super_admin': return t('adminCustomers.superAdmin');
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-label-caps text-xs">{t('adminCustomers.loadingRegistries')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl">
      
      {/* Header */}
      <div className="border-b border-white/5 pb-lg">
        <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('adminCustomers.title')}</h1>
        <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
          {t('adminCustomers.desc')}
        </p>
      </div>

      {/* Users Table */}
      <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
        <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2">
          {t('adminCustomers.registeredAccounts', { count: users.length })}
        </h3>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                <th className="py-3 text-start">{t('adminCustomers.table.identity')}</th>
                <th className="py-3 text-start">{t('adminCustomers.table.email')}</th>
                <th className="py-3 text-start">{t('adminCustomers.table.joined')}</th>
                <th className="py-3 text-start">{t('adminCustomers.table.role')}</th>
                <th className="py-3 text-start">{t('adminCustomers.table.state')}</th>
                <th className="py-3 text-end">{t('adminCustomers.table.manage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-sm">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center font-bold font-label-caps text-[10px]">
                        {(user.name || '').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white uppercase flex items-center gap-xs">
                          {user.name}
                          {user.role !== 'customer' && <Shield className="w-3.5 h-3.5 text-tertiary" />}
                        </h4>
                        <p className="text-[9px] text-on-surface-variant/60 font-mono mt-0.5">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 font-mono text-on-surface-variant/80">{user.email}</td>
                  <td className="py-4 text-[10px]">{user.joinedDate}</td>
                  <td className="py-4">
                    <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block ${
                      ['admin', 'super_admin'].includes(user.role)
                        ? 'bg-tertiary/10 border border-tertiary/20 text-tertiary' 
                        : user.role === 'inventory_manager'
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                        : user.role === 'support_agent'
                        ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                        : 'bg-white/5 border border-white/10 text-white/60'
                    }`}>
                      {getRoleTranslation(user.role)}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block ${
                      user.status === 'active' 
                        ? 'bg-green-500/10 border border-green-500/20 text-green-500' 
                        : 'bg-red-500/10 border border-red-500/20 text-red-500'
                    }`}>
                      {user.status === 'active' ? t('admin.activeStatus') : t('admin.suspendedStatus')}
                    </span>
                  </td>
                  <td className="py-4 text-end flex items-center justify-end gap-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="bg-background border border-white/10 rounded px-2 py-1 text-[9px] font-label-caps text-white focus:outline-none focus:border-tertiary cursor-pointer h-8"
                    >
                      <option value="customer">{t('adminCustomers.customer')}</option>
                      <option value="support_agent">{t('adminCustomers.supportAgent')}</option>
                      <option value="inventory_manager">{t('adminCustomers.inventoryManager')}</option>
                      <option value="admin">{t('adminCustomers.admin')}</option>
                      <option value="super_admin">{t('adminCustomers.superAdmin')}</option>
                    </select>

                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 border border-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                      title="Delete User Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
