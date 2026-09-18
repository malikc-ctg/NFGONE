'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full text-center space-y-4 rounded-xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 text-xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Application Error</h2>
          <p className="text-sm text-slate-400">
            A critical application error occurred. The incident has been automatically captured for investigation.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-500">Incident ID: {error.digest}</p>
          )}
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium text-sm transition"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-medium text-sm transition"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
