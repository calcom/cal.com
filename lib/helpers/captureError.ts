import { label, NextMiddleware } from "next-api-middleware";
import * as Sentry from "@sentry/nextjs";
import nanoid from "nanoid";

// 1 – Create middleware functions

const captureErrors: NextMiddleware = async (req, res, next) => {
  try {
    // Catch any errors that are thrown in remaining
    // middleware and the API route handler
    await next();
  } catch (err) {
    const eventId = Sentry.captureException(err);

    res.status(500);
    res.json({ error: err });
  }
};

const addRequestId: NextMiddleware = async (req, res, next) => {
  // Let remaining middleware and API route execute
  await next();

  // Apply header
  res.setHeader("X-Response-ID", nanoid());
};

// 2 – Use `label` to assemble all middleware

const withMiddleware = label(
  {
    addRequestId,
    sentry: captureErrors, // <-- Optionally alias middleware
  },
  ["sentry"] // <-- Provide a list of middleware to call automatically
);

// 3 – Define your API route handler

const apiRouteHandler = async (req, res) => {
  res.status(200);
  res.send("Hello world!");
};

// 4 – Choose middleware to invoke for this API route

export default withMiddleware("addRequestId")(apiRouteHandler);