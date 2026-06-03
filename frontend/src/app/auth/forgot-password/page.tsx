'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setMessage('');

    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
      setMessage(response.data?.message || 'If the email matches an active profile, a reset link will be sent.');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to request reset. Please try again later.');
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
          <p className="font-label-caps text-[10px] text-tertiary tracking-[0.2em]">RECOVER SECRET PASSKEY</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 font-label-caps text-[10px] rounded text-center">
            {errorMsg}
          </div>
        )}

        {submitted ? (
          <div className="space-y-lg py-4 text-center">
            <div className="h-16 w-16 bg-tertiary/10 text-tertiary rounded-full flex items-center justify-center mx-auto text-2xl border border-tertiary/20">
              <Mail className="h-6 w-6 text-tertiary" />
            </div>
            <p className="text-sm font-sans text-on-surface-variant leading-relaxed">
              {message}
            </p>
            <p className="text-xs font-sans text-on-surface-variant/80">
              Please check your inbox and spam folder for instructions to change your passkey.
            </p>
            <div className="pt-4 border-t border-outline-variant">
              <Link href="/auth/login" className="w-full inline-block py-4 bg-white text-black hover:bg-tertiary font-button text-xs uppercase tracking-widest rounded-lg transition-all text-center">
                BACK TO SIGN IN
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-lg">
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans normal-case text-pretty text-center">
              Enter the email address associated with your APEX LUXE profile. We will dispatch a secure link to reset your passkey.
            </p>

            <div className="space-y-xs">
              <label className="font-label-caps text-[10px] text-on-surface-variant block">EMAIL ADDRESS</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-outline-variant focus:border-tertiary focus:ring-0 px-md py-4 text-foreground rounded-lg outline-none text-sm font-sans"
                placeholder="e.g. member@apexluxe.com"
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
                  DISPATCHING LINK...
                </>
              ) : (
                'DISPATCH RESET LINK'
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
