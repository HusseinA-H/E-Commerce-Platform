'use client';

import React from 'react';

interface QRCodeProps {
  type: 'product' | 'referral' | 'order';
  value: string;
  className?: string;
}

export default function QRCode({ type, value, className = '' }: QRCodeProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const qrUrl = `${API_URL}/qr/${type}/${value}`;

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-secondary border border-border rounded-none text-center ${className}`}>
      <span className="text-[10px] font-label-caps text-tertiary tracking-widest uppercase mb-2">
        {type} QR CODE
      </span>
      <div className="relative w-40 h-40 bg-white p-2 border border-white/5 shadow-lg flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt={`${type} QR Code`}
          className="w-full h-full object-contain select-none"
          loading="lazy"
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 font-geist">
        Scan to view {type === 'referral' ? 'signup' : type} instantly.
      </p>
    </div>
  );
}
