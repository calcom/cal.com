import * as Sentry from "@sentry/nextjs";
import type { NextMiddleware } from "next-api-middleware";

import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";

export const captureErrors: NextMiddleware = async (_req, res, next) => {
  try {
    // Catch any errors that are thrown in remaining
    // middleware and the API route handler
    await next();
  } catch (error) {
    Sentry.captureException(error);

    console.error(error);
    const serverError = getServerErrorFromUnknown(error);

    res.status(serverError.statusCode).json({ message: serverError.message });
  }
};
