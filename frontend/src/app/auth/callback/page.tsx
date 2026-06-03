'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store';
import { apiClient } from '../../../lib/api-client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingStep, setLoadingStep] = useState('Securing consent profile...');

  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;

    const status = searchParams.get('status');
    const errorMessage = searchParams.get('message');

    if (status === 'error') {
      hasRunRef.current = true;
      router.push(`/auth/callback/error?message=${encodeURIComponent(errorMessage || 'Unknown OAuth error')}`);
      return;
    }

    if (status === 'success') {
      hasRunRef.current = true;
      const hydrateSession = async () => {
        try {
          setLoadingStep('Hydrating security session...');
          
          // Request user profile from backend (backend will read secure HttpOnly cookie)
          const response = await apiClient.get('/users/me');
          const user = response.data;
          
          if (!user) {
            throw new Error('Identity verification failed: profile not found');
          }

          setLoadingStep('Synchronizing local state stores...');
          
          // Hydrate Zustand Auth store
          useAuthStore.setState({ currentUser: user });

          setLoadingStep('Access granted. Redirecting...');
          
          const adminRoles = ['admin', 'super_admin', 'inventory_manager', 'support_agent'];
          if (adminRoles.includes(user.role)) {
            router.push('/admin');
          } else {
            router.push('/profile');
          }
        } catch (err: any) {
          console.error('Session hydration failed:', err);
          const msg = err.response?.data?.message || err.message || 'Session synchronization failed';
          router.push(`/auth/callback/error?message=${encodeURIComponent(msg)}`);
        }
      };

      void hydrateSession();
    } else {
      // If accessed directly without parameters, redirect to login
      router.push('/auth/login');
    }
  }, [searchParams, router]);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center px-6 py-20 relative">
      <div className="w-full max-w-md bg-surface-low border border-white/5 p-8 rounded-xl shadow-2xl space-y-xl text-center flex flex-col items-center justify-center">
        {/* Animated micro-loader */}
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-t border-b border-tertiary animate-spin"></div>
          <Loader2 className="h-6 w-6 text-white animate-pulse absolute" />
        </div>

        <div className="space-y-sm">
          <div className="font-display-lg text-2xl tracking-tighter text-white">APEX LUXE</div>
          <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em]">{loadingStep}</p>
        </div>

        <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed font-sans normal-case text-pretty">
          Please wait while we cryptographically sign your access key and verify credentials with the identity provider.
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div className="w-full max-w-md bg-surface-low border border-white/5 p-8 rounded-xl shadow-2xl space-y-xl text-center flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em] mt-md">
              INITIALIZING SECURITY CONTEXT...
            </p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
