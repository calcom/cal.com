import * as Sentry from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Filter noisy Prisma child spans (serialize, compile, query, db_query) but keep prisma:client:operation.
      // Also filter low-level "db" spans (pg-pool.connect, SELECT, etc.) that are children of Prisma spans.
      ignoreSpans: [{ op: /^prisma:client:(?!operation)/ }, { op: "db" }],
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
  }
}
