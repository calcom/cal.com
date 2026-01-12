// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_CLIENT,

    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE ?? "1.0") || 1.0,
    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.0") || 0.0,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    // replaysSessionSampleRate: parseFloat(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? "0.0") || 0.0,

    // Define how likely Replay events are sampled when an error occurs.
    // replaysOnErrorSampleRate: parseFloat(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? "0.0") || 0.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: !!process.env.SENTRY_DEBUG,
    beforeSend(event) {
      if (
        event.exception?.values?.some(
          (e) =>
            // Ignore fake error "UnhandledRejection: Non-Error promise rejection captured with value: Object Not Found Matching Id:3, MethodName:update, ParamCount:4"
            // Raised GH issue: https://github.com/getsentry/sentry-javascript/issues/3440
            e.value?.includes("Non-Error promise rejection captured with") ||
            e.value?.includes("Object Not Found Matching Id")
        )
      ) {
        return null;
      }

      event.tags = {
        ...event.tags,
        errorSource: "client",
      };
      return event;
    },
  });
}

export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureRouterTransitionStart(url, navigationType);
  }
}

if (
  process.env.NEXT_PUBLIC_VERCEL_USE_BOTID_IN_BOOKER === "1" &&
  typeof window !== "undefined" &&
  typeof window.crypto?.getRandomValues === "function" &&
  typeof window.crypto?.randomUUID === "function"
) {
  initBotId({
    protect: [
      {
        path: "/api/book/event",
        method: "POST",
      },
    ],
  });
}
