import * as Sentry from "@sentry/nextjs";
import type { NextMiddleware } from "next-api-middleware";

import { redactError } from "@calcom/lib/redactError";

export const captureErrors: NextMiddleware = async (_req, res, next) => {
  try {
    // Catch any errors that are thrown in remaining
    // middleware and the API route handler
    await next();
  } catch (error) {
    Sentry.captureException(error);
    const redactedError = redactError(error);
    if (redactedError instanceof Error) {
      res.status(400).json({ message: redactedError.message, error: redactedError });
      return;
    }
    res.status(400).json({ message: "Something went wrong", error });
  }
};
