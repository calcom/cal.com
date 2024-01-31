import { captureException as SentryCaptureException } from "@sentry/nextjs";

import { redactError } from "@calcom/lib/redactError";

import { middleware } from "../trpc";

const captureErrorsMiddleware = middleware(async ({ next }) => {
  const result = await next();
  if (result && !result.ok) {
    const cause = result.error.cause;
    if (!cause) {
      return result;
    }
    SentryCaptureException(cause);
    throw redactError(cause);
  }
  return result;
});

export default captureErrorsMiddleware;
