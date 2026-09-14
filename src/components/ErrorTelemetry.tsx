"use client";

import { useEffect } from "react";

export function reportClientError(message: string, error?: unknown, metadata?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  try {
    const payload = {
      type: "CLIENT_ERROR",
      message: error instanceof Error ? error.message : message,
      stack: error instanceof Error ? error.stack : undefined,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata,
    };

    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
}

export default function ErrorTelemetry() {
  useEffect(() => {
    // 1. Capture uncaught JavaScript runtime errors
    const handleError = (event: ErrorEvent) => {
      reportClientError(event.message, event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // 2. Capture unhandled Promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportClientError(
        reason instanceof Error ? reason.message : String(reason || "Unhandled Promise Rejection"),
        reason instanceof Error ? reason : undefined,
        { type: "unhandledrejection" }
      );
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
