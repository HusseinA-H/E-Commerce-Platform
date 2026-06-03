'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6 py-20 bg-background text-on-background">
          <div className="w-full max-w-md bg-surface-low border border-white/5 p-8 rounded-xl shadow-2xl text-center space-y-lg">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-7 w-7" />
            </div>
            
            <div className="space-y-sm">
              <h1 className="font-display-lg text-2xl text-white uppercase tracking-tight">SYSTEM EXCEPTION</h1>
              <p className="text-sm font-sans normal-case text-on-surface-variant leading-relaxed text-pretty">
                An unexpected system-level error has occurred. The request thread was terminated prematurely.
              </p>
              {this.state.error?.message && (
                <div className="p-3 bg-black/40 border border-white/5 rounded text-left text-xs font-mono text-red-400 break-all overflow-x-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-sm pt-md">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3.5 bg-white hover:bg-tertiary hover:text-black text-black font-button text-xs uppercase rounded transition-colors"
              >
                RELOAD INTERFACE
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="text-xs font-label-caps text-on-surface-variant hover:text-white transition-colors uppercase"
              >
                Dismiss Warning
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
