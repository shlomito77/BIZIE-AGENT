import * as Sentry from "@sentry/react";

let initialized = false;

export function initMonitoring() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE,
  });
  initialized = true;
}
