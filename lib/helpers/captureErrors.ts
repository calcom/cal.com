import { NextMiddleware } from "next-api-middleware";
import * as Sentry from "@sentry/nextjs";

export const captureErrors: NextMiddleware = async (_req, res, next) => {
  try {
    // Catch any errors that are thrown in remaining
    // middleware and the API route handler
    await next();
  } catch (err) {
    const eventId = Sentry.captureException(err);
    console.log(eventId)
    res.status(500);
    res.json({ error: err });
  }
};

