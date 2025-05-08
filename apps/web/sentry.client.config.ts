import * as Sentry from "@sentry/nextjs";

Sentry.init({
  debug: !!process.env.SENTRY_DEBUG,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0") || 0.0,
  // Controls the percentage of user sessions that are recorded as replays regardless of whether an error occurs
  replaysSessionSampleRate: parseFloat(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? "0.0") || 0.0,
  // Controls the percentage of sessions where a replay is recorded only when an error is captured by Sentry
  replaysOnErrorSampleRate: parseFloat(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? "0.0") || 0.0,
  _experiments: {
    maxSpans: parseInt(process.env.SENTRY_MAX_SPANS ?? "1000") || 1000,
  },
  integrations: [Sentry.replayIntegration()],
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      errorSource: "client",
    };
    return event;
  },
});
