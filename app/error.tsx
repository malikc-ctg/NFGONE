'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 font-bold text-xl">
          ⚠
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          An unexpected error occurred while loading this view. The telemetry event has been recorded.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs font-mono text-slate-400">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
