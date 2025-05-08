import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  debug: !!process.env.SENTRY_DEBUG,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0"),
  replaysSessionSampleRate: parseFloat(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? "0.0"), // Capture 10% of sessions for replay
  replaysOnErrorSampleRate: parseFloat(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? "0.0"), // Capture replays for all error events
  _experiments: {
    maxSpans: parseInt(process.env.SENTRY_MAX_SPANS ?? "1000") || 1000,
  },
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      errorSource: "client",
    };
    return event;
  },
});
