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
      <body style={{ margin: 0, background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "white", border: "1px solid #fecaca", borderRadius: "12px", padding: "2rem", maxWidth: "480px", width: "100%", textAlign: "center" }}>
            <h2 style={{ color: "#991b1b", fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Application Error</h2>
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginBottom: "1rem" }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              style={{ background: "#1e293b", color: "white", border: "none", borderRadius: "8px", padding: "0.5rem 1.25rem", fontSize: "0.875rem", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
