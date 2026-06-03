'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email credentials...');
  
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing. Please check your link.');
      return;
    }

    const verify = async () => {
      hasRunRef.current = true;
      try {
        const response = await apiClient.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data?.message || 'Email verified successfully. You may now sign in.');
      } catch (err: any) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The token may be invalid or expired.');
      }
    };

    void verify();
  }, [searchParams]);

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center px-6 py-20 relative">
      
      {/* Return to shop link */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-xs font-label-caps text-xs text-on-surface-variant hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Shop
      </Link>

      <div className="w-full max-w-md bg-surface-low border border-outline-variant p-6 md:p-8 rounded-xl shadow-2xl space-y-xl text-center flex flex-col items-center">
        
        {/* Header Branding */}
        <div className="text-center space-y-sm w-full">
          <div className="font-display-lg text-3xl tracking-tighter text-foreground">APEX LUXE</div>
          <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em]">ACCOUNT VERIFICATION</p>
        </div>

        {status === 'loading' && (
          <div className="space-y-lg py-4 flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-tertiary animate-spin" />
            <p className="text-sm font-sans text-on-surface-variant leading-relaxed">
              {message}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-lg py-4 flex flex-col items-center w-full">
            <CheckCircle2 className="h-16 w-16 text-tertiary animate-pulse" />
            <p className="text-sm font-sans text-on-surface-variant leading-relaxed px-4">
              {message}
            </p>
            <div className="w-full pt-4 border-t border-outline-variant">
              <Link href="/auth/login" className="w-full inline-block py-4 bg-white text-black hover:bg-tertiary font-button text-xs uppercase tracking-widest rounded-lg transition-all text-center">
                PROCEED TO SIGN IN
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-lg py-4 flex flex-col items-center w-full">
            <XCircle className="h-16 w-16 text-red-500" />
            <p className="text-sm font-sans text-on-surface-variant leading-relaxed px-4">
              {message}
            </p>
            <div className="w-full pt-4 border-t border-outline-variant flex flex-col gap-sm">
              <Link href="/auth/login" className="w-full inline-block py-4 bg-white text-black hover:bg-tertiary font-button text-xs uppercase tracking-widest rounded-lg transition-all text-center">
                BACK TO SIGN IN
              </Link>
              <Link href="/auth/register" className="text-xs text-on-surface-variant hover:text-foreground font-sans underline">
                Need to create a new account? Register
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div className="w-full max-w-md bg-surface-low border border-outline-variant p-8 rounded-xl shadow-2xl space-y-xl text-center flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em] mt-md">
              INITIALIZING SECURITY CONTEXT...
            </p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
