import * as Sentry from "@sentry/nextjs";
import type { NextMiddleware } from "next-api-middleware";

export const captureErrors: NextMiddleware = async (_req, res, next) => {
  try {
    // Catch any errors that are thrown in remaining
    // middleware and the API route handler
    await next();
  } catch (error) {
    Sentry.captureException(error);
    console.log(error);
    res.status(400).json({ message: "Something went wrong", error });
  }
};
