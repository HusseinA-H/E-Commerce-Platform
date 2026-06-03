'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) {
      setToken(t);
    } else {
      setErrorMsg('Reset token is missing from the URL. Please verify your link.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword.length < 8) {
      setErrorMsg('Passkey must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Secrets do not match. Please verify.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setSubmitted(true);
      setSuccessMsg(response.data?.message || 'Passkey updated successfully. You may now sign in.');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update passkey. The token may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center px-6 py-20 relative">
      
      {/* Return to login link */}
      <Link 
        href="/auth/login" 
        className="absolute top-8 left-8 flex items-center gap-xs font-label-caps text-xs text-on-surface-variant hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Login
      </Link>

      <div className="w-full max-w-md bg-surface-low border border-outline-variant p-6 md:p-8 rounded-xl shadow-2xl space-y-xl">
        
        {/* Header Branding */}
        <div className="text-center space-y-sm">
          <div className="font-display-lg text-3xl tracking-tighter text-foreground">APEX LUXE</div>
          <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em]">RESET SECRET PASSKEY</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 font-label-caps text-[10px] rounded text-center">
            {errorMsg}
          </div>
        )}

        {submitted ? (
          <div className="space-y-lg py-4 text-center">
            <div className="h-16 w-16 bg-tertiary/10 text-tertiary rounded-full flex items-center justify-center mx-auto text-2xl border border-tertiary/20">
              <CheckCircle2 className="h-6 w-6 text-tertiary animate-pulse" />
            </div>
            <p className="text-sm font-sans text-on-surface-variant leading-relaxed">
              {successMsg}
            </p>
            <div className="pt-4 border-t border-outline-variant">
              <Link href="/auth/login" className="w-full inline-block py-4 bg-white text-black hover:bg-tertiary font-button text-xs uppercase tracking-widest rounded-lg transition-all text-center">
                SIGN IN WITH NEW PASSKEY
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-lg">
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans normal-case text-pretty text-center">
              Create a new secure passkey. Ensure it is at least 8 characters and contains a mix of digits and symbols.
            </p>

            <div className="space-y-xs">
              <label className="font-label-caps text-[10px] text-on-surface-variant block">NEW PASSKEY</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-background border border-outline-variant focus:border-tertiary focus:ring-0 px-md py-4 text-foreground rounded-lg outline-none text-sm font-sans"
                placeholder="••••••••"
                required
                disabled={!token}
              />
            </div>

            <div className="space-y-xs">
              <label className="font-label-caps text-[10px] text-on-surface-variant block">CONFIRM NEW PASSKEY</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-background border border-outline-variant focus:border-tertiary focus:ring-0 px-md py-4 text-foreground rounded-lg outline-none text-sm font-sans"
                placeholder="••••••••"
                required
                disabled={!token}
              />
            </div>

            <button 
              type="submit"
              disabled={loading || !token}
              className="w-full py-4 bg-white text-black hover:bg-tertiary font-button text-xs uppercase tracking-widest rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  RECONFIGURING SECURITY...
                </>
              ) : (
                'SAVE NEW PASSKEY'
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
