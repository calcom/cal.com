import * as Sentry from "@sentry/nextjs";

Sentry.init({
  debug: !!process.env.SENTRY_DEBUG,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable performance monitoring
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE_CLIENT ?? "0.0") || 0.0,

  // Disable session replay - It could be super costly performance wise, so enable separately
  replaysSessionSampleRate: 0,
  // It could be costly too to track, so enable separately
  replaysOnErrorSampleRate: 0,
});
