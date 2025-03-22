import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.0, // Disable tracing in edge runtime
  integrations: [new Sentry.Integrations.Http({ tracing: false })],
});
