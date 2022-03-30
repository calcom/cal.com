import * as Sentry from "@sentry/nextjs";
import { NextMiddleware } from "next-api-middleware";

export const captureErrors: NextMiddleware = async (_req, res, next) => {
  try {
    // Catch any errors that are thrown in remaining
    // middleware and the API route handler
    await next();
  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    res.status(400).json({ message: "Something went wrong", error: err });
    // res.json({ error: err });
  }
};
