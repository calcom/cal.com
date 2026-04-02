"use client";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { redactError } from "@calcom/lib/redactError";
import { ErrorPage } from "@components/error/error-page";
import { captureException } from "@sentry/nextjs";
import React from "react";

const log = logger.getSubLogger({ prefix: ["[error]"] });

export type ErrorProps = {
  error: Error;
  reset?: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    log.error(error);

    // Log the error to Sentry
    captureException(error);
  }, [error]);

  const processedError = React.useMemo(() => {
    const err = getErrorFromUnknown(error);

    if (err instanceof HttpError) {
      const redactedError = redactError(err);
      return {
        statusCode: err.statusCode,
        title: redactedError.name,
        name: redactedError.name,
        message: redactedError.message,
        url: err.url,
        method: err.method,
        cause: err.cause,
      };
    }

    return {
      statusCode: 500,
      title: "Internal Server Error",
      name: "Internal Server Error",
      message: "An unexpected error occurred.",
    };
  }, [error]);

  return (
    <ErrorPage
      reset={reset}
      statusCode={processedError.statusCode}
      error={processedError}
      message={processedError.message}
    />
  );
}
