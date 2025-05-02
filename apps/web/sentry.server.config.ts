// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  debug: !!process.env.SENTRY_DEBUG,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0") || 0.0,
  integrations: [Sentry.prismaIntegration()],
  _experiments: {
    maxSpans: parseInt(process.env.SENTRY_MAX_SPANS ?? "1000") || 1000,
  },
});
