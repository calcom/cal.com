import * as Sentry from "@sentry/nextjs";
import { NextMiddleware } from "next-api-middleware";

export const captureErrors: NextMiddleware = async (_req, res, next) => {
  try {
    // Catch any errors that are thrown in remaining
    // middleware and the API route handler
    await next();
  } catch (err) {
    Sentry.captureException(err);
    res.status(500);
    res.json({ error: err });
  }
};
