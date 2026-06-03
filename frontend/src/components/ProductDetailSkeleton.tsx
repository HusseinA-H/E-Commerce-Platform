'use client';

import React from 'react';

export default function ProductDetailSkeleton() {
  return (
    <div className="bg-background text-on-background min-h-screen pb-xxl animate-pulse">
      <main className="pt-8 pb-xxl px-4 md:px-margin-desktop max-w-container-max mx-auto space-y-xxl">
        
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-xs">
          <div className="h-3 w-12 bg-surface-low rounded" />
          <div className="h-3 w-3 bg-surface-low rounded" />
          <div className="h-3 w-16 bg-surface-low rounded" />
          <div className="h-3 w-3 bg-surface-low rounded" />
          <div className="h-3 w-24 bg-surface-low rounded" />
        </div>

        {/* Gallery & Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          
          {/* Gallery Skeleton (Left: 7 cols) */}
          <div className="lg:col-span-7 space-y-md">
            <div className="aspect-[4/5] bg-surface-low rounded-xl border border-white/5" />
            <div className="grid grid-cols-4 gap-sm">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="aspect-[4/5] bg-surface-low rounded-lg border border-white/5" />
              ))}
            </div>
          </div>

          {/* Details & Selectors Skeleton (Right: 5 cols) */}
          <div className="lg:col-span-5 space-y-lg">
            
            {/* Title & Price */}
            <div className="space-y-sm">
              <div className="h-3 w-28 bg-surface-low rounded" />
              <div className="h-10 w-2/3 bg-surface-low rounded" />
              <div className="h-7 w-20 bg-surface-low rounded pt-2" />
            </div>

            {/* Description */}
            <div className="space-y-sm pt-2">
              <div className="h-4 w-full bg-surface-low rounded" />
              <div className="h-4 w-5/6 bg-surface-low rounded" />
              <div className="h-4 w-4/5 bg-surface-low rounded" />
            </div>

            {/* Color Selector */}
            <div className="space-y-md pt-2">
              <div className="h-3.5 w-32 bg-surface-low rounded" />
              <div className="flex gap-sm">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-9 w-20 bg-surface-low rounded" />
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="space-y-md pt-2">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-24 bg-surface-low rounded" />
                <div className="h-3 w-16 bg-surface-low rounded" />
              </div>
              <div className="grid grid-cols-5 gap-sm">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="h-12 bg-surface-low rounded" />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-md pt-md">
              <div className="flex-1 h-14 bg-surface-low rounded" />
              <div className="w-14 h-14 bg-surface-low rounded" />
            </div>

            {/* Accordion Divider mimicking care/fit dropdowns */}
            <div className="pt-xl divide-y divide-white/10 border-t border-white/10 space-y-lg">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center py-md">
                  <div className="h-3 w-32 bg-surface-low rounded" />
                  <div className="h-5 w-5 bg-surface-low rounded-full" />
                </div>
              ))}
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
