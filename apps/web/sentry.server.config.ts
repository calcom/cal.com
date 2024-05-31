import { init as SentryInit } from "@sentry/nextjs";

SentryInit({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
