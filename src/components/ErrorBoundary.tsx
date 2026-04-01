import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error('React Component Error', error, errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 text-slate-900">
          <div className="max-w-md p-8 bg-white rounded-2xl shadow-xl border border-red-100">
            <h2 className="text-2xl font-black text-red-600 mb-4">Something went wrong</h2>
            <p className="text-sm text-slate-600 mb-6">
              We've encountered an unexpected error. Our team has been notified.
            </p>
            <div className="p-4 bg-slate-100 rounded-lg overflow-auto max-h-48 mb-6">
              <pre className="text-xs text-slate-800 whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
