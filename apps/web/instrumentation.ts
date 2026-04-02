import process from "node:process";
import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NODE_ENV === "production") {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    }
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
  }
}

export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureRequestError(err, request, context);
  }
};
