import * as Sentry from "@sentry/nextjs";

Sentry.init({
  debug: !!process.env.SENTRY_DEBUG,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0") || 0.0,
  _experiments: {
    maxSpans: parseInt(process.env.SENTRY_MAX_SPANS ?? "1000") || 1000,
  },
});
