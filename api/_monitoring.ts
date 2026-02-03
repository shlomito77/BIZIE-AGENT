import * as Sentry from "@sentry/node";

let initialized = false;

function init() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || "development",
  });
  initialized = true;
}

export function captureError(
  error: unknown,
  context?: Record<string, any>
) {
  init();
  if (!Sentry.getCurrentHub().getClient()) return;
  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext("request", context);
      Sentry.captureException(error);
    });
    return;
  }
  Sentry.captureException(error);
}
