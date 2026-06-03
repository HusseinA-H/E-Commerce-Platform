'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingBoundaryProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function LoadingBoundary({
  isLoading,
  children,
  fallback,
}: LoadingBoundaryProps) {
  if (isLoading) {
    return (
      fallback || (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] py-12">
          <Loader2 className="h-8 w-8 text-tertiary animate-spin" />
          <span className="mt-md font-label-caps text-[10px] text-on-surface-variant/40 tracking-[0.25em] uppercase">
            SYNCING PERFORMANCE DATA
          </span>
        </div>
      )
    );
  }

  return <>{children}</>;
}
