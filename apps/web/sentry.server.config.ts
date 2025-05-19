// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  debug: !!process.env.SENTRY_DEBUG,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE ?? "1.0") || 1.0,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0") || 0.0,
  integrations: [Sentry.prismaIntegration()],
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      errorSource: "server",
    };
    return event;
  },
});
