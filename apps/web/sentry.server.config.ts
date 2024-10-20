import * as Sentry from "@sentry/nextjs";
import { Integrations } from "@sentry/tracing";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.0,
  integrations: [
    new Integrations.Postgres(), // Optional: For Postgres performance tracing
    new Integrations.Http({ tracing: true }), // For HTTP performance tracing
  ],
});
