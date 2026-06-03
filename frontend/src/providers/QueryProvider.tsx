'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false, // Prevents background refetch storms on navigation / component layout cycles if data is cached
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes default stale time
        gcTime: 1000 * 60 * 15, // 15 minutes default cache time
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
