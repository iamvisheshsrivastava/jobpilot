"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
          <div className="rounded-xl border border-red-200 bg-white px-6 py-5 max-w-lg shadow-sm">
            <h2 className="text-base font-semibold text-red-800 mb-1">Application Error</h2>
            <p className="text-sm text-red-600 mb-3">{error.message || "An unexpected error occurred."}</p>
            {process.env.NODE_ENV === "development" && error.stack && (
              <pre className="text-left text-xs text-red-500 bg-red-50 rounded p-3 overflow-auto max-h-48 mb-3">
                {error.stack}
              </pre>
            )}
            <button
              onClick={reset}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
