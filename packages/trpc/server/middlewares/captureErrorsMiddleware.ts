import { captureException } from "@sentry/nextjs";

import { redactError } from "@calcom/lib/redactError";

import { middleware } from "../trpc";

const captureErrorsMiddleware = middleware(async ({ next }) => {
  try {
    const result = await next();
    if (result.ok) return result;
    if (!result.error.cause) return result;
    throw result.error.cause;
  } catch (error) {
    captureException(error);
    throw redactError(error);
  }
});

export default captureErrorsMiddleware;
