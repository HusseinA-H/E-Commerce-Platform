'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store';
import { useLogoutMutation } from '../../hooks/useAuth';
import { useTranslation } from '../../providers/I18nProvider';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
  BarChart3,
  LogOut,
  ShieldAlert,
  Settings,
  History,
  Tag,
  Boxes,
  Sparkles,
  Cpu,
  Search,
  TrendingUp,
  Menu,
  X,
  Globe,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [mounted, setMounted] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const logoutMutation = useLogoutMutation();
  const { locale, t } = useTranslation();

  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      router.push(lLink('/'));
    } catch (e) {
      router.push(lLink('/'));
    }
  };

  // Avoid hydration mismatch
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin"></div>
      </div>
    );
  }

  const adminRoles = ['admin', 'super_admin', 'inventory_manager', 'support_agent'];
  const authorized = currentUser && adminRoles.includes(currentUser.role);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md bg-surface-low border border-red-500/10 p-8 rounded-xl shadow-2xl text-center space-y-lg">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-sm">
            <h1 className="font-display-lg text-2xl text-white uppercase tracking-tight">{t('admin.accessDenied')}</h1>
            <p className="text-sm font-sans normal-case text-on-surface-variant leading-relaxed">
              {t('admin.adminRequired')}
            </p>
          </div>
          <div className="flex flex-col gap-sm pt-md">
            <button 
              onClick={() => router.push(lLink('/auth/login'))}
              className="w-full py-3.5 bg-white hover:bg-tertiary hover:text-black text-black font-button text-xs uppercase rounded transition-colors"
            >
              {t('admin.signInAdmin')}
            </button>
            <Link 
              href={lLink('/')}
              className="text-xs font-label-caps text-on-surface-variant hover:text-white transition-colors"
            >
              {t('admin.returnStorefront')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: lLink('/admin'), label: t('admin.overview'), icon: LayoutDashboard },
    { href: lLink('/admin/catalog-intelligence'), label: t('admin.catalogIntelligence'), icon: Sparkles },
    { href: lLink('/admin/products'), label: t('admin.products'), icon: Package },
    { href: lLink('/admin/inventory'), label: t('admin.inventory'), icon: Boxes },
    { href: lLink('/admin/orders'), label: t('admin.ordersLog'), icon: ClipboardList },
    { href: lLink('/admin/customers'), label: t('admin.customers'), icon: Users },
    { href: lLink('/admin/analytics'), label: t('admin.analytics'), icon: BarChart3 },
    { href: lLink('/admin/retention'), label: t('admin.retention'), icon: TrendingUp },
    { href: lLink('/admin/coupons'), label: t('admin.coupons'), icon: Tag },
    { href: lLink('/admin/ai-telemetry'), label: t('admin.aiTelemetry'), icon: Cpu },
    { href: lLink('/admin/global-intelligence'), label: t('admin.globalIntelligence'), icon: Sparkles },
    { href: lLink('/admin/search-analytics'), label: t('admin.searchIntel'), icon: Search },
    { href: lLink('/admin/audit-logs'), label: t('admin.auditLogs'), icon: History },
    { href: lLink('/admin/global'), label: t('admin.globalCommerce'), icon: Globe },
    { href: lLink('/admin/settings'), label: t('admin.settings'), icon: Settings },
  ];

  const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-background">
      
      {/* 1. Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-surface border-b lg:border-b-0 lg:border-e border-outline-variant flex flex-col shrink-0">
        
        {/* Mobile Header Toggle */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-surface-lowest border-b border-outline-variant">
          <div className="flex items-center gap-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest text-foreground font-display-lg uppercase">{t('admin.dashboardTitle')}</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="w-10 h-10 border border-outline rounded-full flex items-center justify-center text-foreground active:scale-95 transition-transform"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Sidebar Nav & Info */}
        <div className={`${isMobileOpen ? 'flex' : 'hidden'} lg:flex flex-col flex-1 justify-between bg-surface`}>
          <div className="py-md lg:py-xl">
            {/* Admin Header */}
            <div className="px-6 pb-lg border-b border-outline-variant space-y-xs hidden lg:block">
              <h2 className="font-display-lg text-lg text-foreground uppercase tracking-tighter">{t('admin.dashboardTitle')}</h2>
              <div className="flex items-center gap-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="text-[9px] font-label-caps text-tertiary tracking-widest">{t('admin.controlShell')}</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="mt-lg px-3 space-y-xs">
              {navLinks.map((link) => {
                const isActive = cleanPath === link.href.replace(/^\/(en|ar)/, '') || (cleanPath === '/' && link.href === '/');
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-sm px-4 py-3 rounded-lg font-button text-xs uppercase transition-all ${
                      isActive 
                        ? 'bg-tertiary text-black font-bold' 
                        : 'text-on-surface-variant hover:text-foreground hover:bg-foreground/[0.03]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Info & Sign out */}
          <div className="p-6 border-t border-outline-variant space-y-md bg-surface-lowest/50">
            <div className="flex items-center gap-sm">
              <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs uppercase">
                {currentUser?.name ? currentUser.name.slice(0, 2) : 'AD'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground uppercase break-normal text-pretty">{currentUser?.name || 'Admin Account'}</p>
                <p className="text-[10px] text-on-surface-variant break-normal text-pretty font-mono">{currentUser?.email || 'admin@apexluxe.com'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-xs font-label-caps text-[10px] text-red-500 hover:text-red-400 transition-colors uppercase pt-2 border-t border-outline-variant text-start bg-transparent border-0 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {t('admin.exitDashboard')}
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Page Content Panel */}
      <div className="flex-1 overflow-y-auto p-6 md:p-margin-desktop bg-background pb-20">
        {children}
      </div>

    </div>
  );
}
