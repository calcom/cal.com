import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      errorSource: "edge",
    };
    return event;
  },
});
