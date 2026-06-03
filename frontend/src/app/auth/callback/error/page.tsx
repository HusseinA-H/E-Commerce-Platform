'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

function AuthCallbackErrorContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message') || 'An unexpected authentication error occurred.';
  const isRateLimit = errorMessage.toLowerCase().includes('throttler') || 
                      errorMessage.toLowerCase().includes('too many requests') ||
                      errorMessage.toLowerCase().includes('429');

  const titleText = isRateLimit ? 'RATE LIMIT EXCEEDED' : 'AUTHENTICATION FAILURE';
  const labelText = isRateLimit ? 'TOO MANY REQUESTS' : 'CONSENT ACCESS DENIED';
  const descText = isRateLimit 
    ? 'To protect the security of your profile, our systems temporarily block access when receiving excessive requests. Please wait a minute and try again.'
    : 'This may be caused by a mismatched configuration, credential revocation, or duplicate email conflicts. You can link this provider account once logged in via credentials.';

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center px-6 py-20 relative">
      <div className="w-full max-w-md bg-surface-low border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-xl text-center flex flex-col items-center">
        
        {/* Error icon */}
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full mb-md animate-pulse">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <div className="space-y-sm">
          <div className="font-display-lg text-2xl tracking-tighter text-white">{titleText}</div>
          <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em]">{labelText}</p>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/5 rounded text-left space-y-xs text-xs font-sans normal-case text-on-surface-variant leading-relaxed w-full">
          <p className="font-bold text-white uppercase tracking-wider text-[10px] font-label-caps mb-xs">Error details:</p>
          <p className="text-red-400/90 break-words font-mono text-[11px]">{errorMessage}</p>
        </div>

        <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed font-sans normal-case text-pretty">
          {descText}
        </p>

        <Link
          href="/auth/login"
          className="w-full py-4 bg-white text-black hover:bg-tertiary font-button text-xs uppercase tracking-widest rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          RETURN TO LOGIN
        </Link>
      </div>
    </div>
  );
}

export default function AuthCallbackErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div className="w-full max-w-md bg-surface-low border border-white/5 p-8 rounded-xl shadow-2xl space-y-xl text-center flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em] mt-md">
              LOADING ERROR DETAILS...
            </p>
          </div>
        </div>
      }
    >
      <AuthCallbackErrorContent />
    </Suspense>
  );
}
