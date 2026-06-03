'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store';
import SocialAuthButtons from '../../../components/SocialAuthButtons';

export default function RegisterPage() {
  const router = useRouter();
  
  // Zustand State
  const currentUser = useAuthStore((state) => state.currentUser);
  const register = useAuthStore((state) => state.register);

  // Local States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

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
    if (!name.trim() || !email.trim() || !password) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await register(name, email, password);
      if (result.success) {
        setRegistered(true);
      } else {
        setErrorMsg(result.error || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg('Authentication portal offline.');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="bg-background text-on-background min-h-screen flex items-center justify-center px-6 py-20 relative">
        
        <Link 
          href="/" 
          className="absolute top-8 left-8 flex items-center gap-xs font-label-caps text-xs text-on-surface-variant hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Shop
        </Link>

        <div className="w-full max-w-md bg-surface-low border border-outline-variant p-6 md:p-8 rounded-xl shadow-2xl space-y-xl text-center">
          
          <div className="text-center space-y-sm">
            <div className="font-display-lg text-3xl tracking-tighter text-foreground">APEX LUXE</div>
            <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em]">VERIFICATION REQUIRED</p>
          </div>

          <div className="space-y-md py-4">
            <div className="h-16 w-16 bg-tertiary/10 text-tertiary rounded-full flex items-center justify-center mx-auto text-2xl border border-tertiary/20">✓</div>
            <p className="text-sm font-sans text-on-surface-variant leading-relaxed">
              We have dispatched a verification link to <strong className="text-foreground">{email}</strong>.
            </p>
            <p className="text-xs font-sans text-on-surface-variant/80">
              Please click the link in the email to activate your account.
            </p>
          </div>

          <div className="pt-4 border-t border-outline-variant">
            <Link href="/auth/login" className="w-full inline-block py-4 bg-white text-black hover:bg-tertiary font-button text-xs uppercase tracking-widest rounded-lg transition-all text-center">
              PROCEED TO SIGN IN
            </Link>
          </div>

        </div>
      </div>
    );
  }

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

      <div className="w-full max-w-md bg-surface-low border border-outline-variant p-6 md:p-8 rounded-xl shadow-2xl space-y-xl">
        
        {/* Header Branding */}
        <div className="text-center space-y-sm">
          <div className="font-display-lg text-3xl tracking-tighter text-foreground">APEX LUXE</div>
          <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em]">CONSENT REGISTER PORTAL</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 font-label-caps text-[10px] rounded text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-lg">
          <div className="space-y-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant block">FULL NAME</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-outline-variant focus:border-tertiary focus:ring-0 px-md py-4 text-foreground rounded-lg outline-none text-sm font-sans"
              placeholder="e.g. Jean-Luc Picard"
              required
            />
          </div>

          <div className="space-y-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant block">EMAIL ADDRESS</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-outline-variant focus:border-tertiary focus:ring-0 px-md py-4 text-foreground rounded-lg outline-none text-sm font-sans"
              placeholder="e.g. captain@enterprise.com"
              required
            />
          </div>

          <div className="space-y-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant block">SECRET PASSKEY</label>
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
                REGISTERING CREATION
              </>
            ) : (
              'CREATE PERFORMANCE ACCOUNT'
            )}
          </button>
        </form>

        <SocialAuthButtons />

        <div className="text-center text-xs text-on-surface-variant font-sans normal-case pt-2">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-tertiary hover:underline">
            Sign In Portal
          </Link>
        </div>

      </div>
    </div>
  );
}
