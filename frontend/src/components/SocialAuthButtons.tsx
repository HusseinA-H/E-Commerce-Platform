'use client';

import React from 'react';

export default function SocialAuthButtons() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  const handleOAuth = (provider: string) => {
    // Redirect user to NestJS backend OAuth initiation route
    window.location.href = `${apiUrl}/auth/${provider}`;
  };

  const providers = [
    {
      id: 'google',
      name: 'Google',
      color: 'hover:bg-white/5 border-white/10 hover:border-white/20',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.745 1.055 15.018 0 12 0 7.354 0 3.307 2.68 1.285 6.58l3.981 3.185z"
          />
          <path
            fill="#4285F4"
            d="M23.606 12.273c0-.818-.073-1.609-.209-2.373H12v4.5h6.505a5.556 5.556 0 0 1-2.41 3.645l3.75 2.91c2.19-2.02 3.454-4.99 3.454-8.682z"
          />
          <path
            fill="#FBBC05"
            d="M5.266 14.235A7.098 7.098 0 0 1 4.909 12c0-.79.13-1.554.357-2.264l-3.98-3.186A11.966 11.966 0 0 0 0 12c0 2.218.608 4.295 1.664 6.079l3.602-1.844z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.958-1.077 7.945-2.918l-3.75-2.91c-1.036.696-2.368 1.109-4.195 1.109-3.218 0-5.945-2.173-6.918-5.09l-3.98 3.073C3.306 21.32 7.354 24 12 24z"
          />
        </svg>
      ),
    },
    {
      id: 'microsoft',
      name: 'Microsoft',
      color: 'hover:bg-white/5 border-white/10 hover:border-white/20',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 23 23">
          <rect x="0" y="0" width="11" height="11" fill="#F25022" />
          <rect x="12" y="0" width="11" height="11" fill="#7FBA00" />
          <rect x="0" y="12" width="11" height="11" fill="#00A1F1" />
          <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
        </svg>
      ),
    },
    {
      id: 'github',
      name: 'GitHub',
      color: 'hover:bg-white/5 border-white/10 hover:border-white/20',
      icon: (
        <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-md my-sm">
      <div className="relative flex items-center justify-center my-md">
        <div className="border-t border-white/10 w-full"></div>
        <span className="bg-surface-low px-sm text-[9px] text-on-surface-variant font-label-caps absolute tracking-[0.15em] select-none">
          OR SECURE WITH SOCIALS
        </span>
      </div>

      <div className="grid grid-cols-3 gap-xs">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleOAuth(provider.id)}
            className={`flex items-center justify-center p-3 rounded-lg border transition-all active:scale-[0.95] ${provider.color}`}
            title={`Sign in with ${provider.name}`}
          >
            {provider.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
