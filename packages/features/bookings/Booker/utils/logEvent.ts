import * as Sentry from "@sentry/nextjs";

// Consider making it an hook, that would retrieve useful data from useBookerStore and send along with the event
export const logEvent = (eventName: string, data: Record<string, unknown>) => {
  Sentry.captureMessage(eventName, {
    extra: data,
  });
};
