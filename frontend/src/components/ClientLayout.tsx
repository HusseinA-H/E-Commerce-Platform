'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import QueryProvider from '../providers/QueryProvider';
import ToastProvider from '../providers/ToastProvider';
import { I18nProvider } from '../providers/I18nProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { CurrencyProvider } from '../providers/CurrencyProvider';
import { ErrorBoundary } from './ErrorBoundary';
import Navbar from './Navbar';
import Footer from './Footer';
import AISearch from './AISearch';
import AIAssistant from './AIAssistant';
import { useCurrentUserQuery } from '../hooks/useAuth';
import { useAuthStore } from '../store';
import { RealtimeProvider } from '../providers/RealtimeProvider';
import PWAInstallBanner from './PWAInstallBanner';
import PushNotificationInit from './PushNotificationInit';

interface ClientLayoutProps {
  children: React.ReactNode;
  locale?: string;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useCurrentUserQuery();

  React.useEffect(() => {
    const handleUnauthorized = () => {
      useAuthStore.setState({ currentUser: null });
      const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';
      const protectedPaths = ['/profile', '/checkout', '/admin'];
      const isProtected = protectedPaths.some((p) => cleanPath.startsWith(p));
      if (isProtected) {
        const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
        router.push(`/${locale}/auth/login`);
      }
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [pathname, router]);

  return <>{children}</>;
}

export default function ClientLayout({ children, locale = 'en' }: ClientLayoutProps) {
  const pathname = usePathname();
  const cleanPath = pathname.replace(/^\/(en|ar)/, '') || '/';

  const isCheckout = cleanPath === '/checkout';
  const isAuth = cleanPath.startsWith('/auth/');
  const isAdmin = cleanPath.startsWith('/admin');
  const isVendor = cleanPath.startsWith('/vendor');

  const showFooter = !isCheckout && !isAuth && !isAdmin && !isVendor;
  const showNavbar = !isAuth && !isVendor;

  return (
    <QueryProvider>
      <I18nProvider serverLocale={locale as any}>
        <ThemeProvider>
          <ToastProvider>
            <CurrencyProvider>
              <AuthInitializer>
                <RealtimeProvider>
                  <div className="min-h-screen flex flex-col bg-background text-on-background relative font-sans">
                    {showNavbar && <Navbar />}
                    <main className={`flex-1 flex flex-col ${showNavbar ? 'pt-16 md:pt-20' : ''}`}>
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </main>
                    {showFooter && <Footer />}
                    {!isAuth && !isVendor && (
                      <>
                        <AISearch />
                        <AIAssistant />
                        <PWAInstallBanner />
                        <PushNotificationInit />
                      </>
                    )}
                  </div>
                </RealtimeProvider>
              </AuthInitializer>
            </CurrencyProvider>
          </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
