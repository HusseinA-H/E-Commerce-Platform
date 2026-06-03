'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store';
import SocialAuthButtons from '../../../components/SocialAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  
  // Zustand State
  const currentUser = useAuthStore((state) => state.currentUser);
  const login = useAuthStore((state) => state.login);

  // Local States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // If user is already logged in, redirect to profile/admin
  useEffect(() => {
    if (currentUser) {
      if (['admin', 'super_admin'].includes(currentUser.role)) {
        router.push('/admin');
      } else {
        router.push('/profile');
      }
    }
  }, [currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await login(email, password);
      if (result.success) {
        // Redirection handled by useEffect
      } else {
        setErrorMsg(result.error || 'Login failed. Please check credentials.');
      }
    } catch (err: any) {
      setErrorMsg('Authentication portal offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center px-6 py-20 relative">
      
      {/* Absolute return to shop link */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-xs font-label-caps text-xs text-on-surface-variant hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Shop
      </Link>

      <div className="w-full max-w-md bg-surface-low border border-outline-variant p-6 md:p-8 rounded-xl shadow-2xl space-y-xl">
        
        {/* Header Branding */}
        <div className="text-center space-y-sm">
          <div className="font-display-lg text-3xl tracking-tighter text-foreground">APEX LUXE</div>
          <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em]">CONSENT ACCESS PORTAL</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 font-label-caps text-[10px] rounded text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-lg">
          <div className="space-y-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant block">EMAIL ADDRESS</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-outline-variant focus:border-tertiary focus:ring-0 px-md py-4 text-foreground rounded-lg outline-none text-sm font-sans"
              placeholder="e.g. admin@apexluxe.com or customer@gmail.com"
              required
            />
          </div>

          <div className="space-y-xs">
            <div className="flex items-center justify-between">
              <label className="font-label-caps text-[10px] text-on-surface-variant block">SECRET PASSKEY</label>
              <Link href="/auth/forgot-password" className="font-label-caps text-[9px] text-tertiary hover:underline">
                FORGOT PASSKEY?
              </Link>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-outline-variant focus:border-tertiary focus:ring-0 px-md py-4 text-foreground rounded-lg outline-none text-sm font-sans"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black hover:bg-tertiary font-button text-xs uppercase tracking-widest rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AUTHENTICATING
              </>
            ) : (
              'SIGN IN TO ACCESS'
            )}
          </button>
        </form>

        <SocialAuthButtons />

        {/* Demo login tips */}
        <div className="p-4 bg-foreground/[0.02] border border-outline-variant rounded text-left space-y-sm text-[11px] font-sans normal-case text-on-surface-variant text-pretty leading-relaxed">
          <p className="font-bold text-foreground uppercase tracking-wider text-[10px] font-label-caps">Demo Portal Tips:</p>
          <p>• Type <strong className="text-tertiary font-mono">admin@apexluxe.com</strong> to log in as an administrator (unlocks dashboards!).</p>
          <p>• Type <strong className="text-foreground font-mono">alex@mercer.com</strong> to log in as a customer.</p>
          <p>• Any other email will dynamically register a new customer account instantly.</p>
        </div>

        <div className="text-center text-xs text-on-surface-variant font-sans normal-case pt-2">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-tertiary hover:underline">
            Register Account
          </Link>
        </div>

      </div>
    </div>
  );
}
