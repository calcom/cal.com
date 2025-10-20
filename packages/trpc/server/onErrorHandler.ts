import { captureException } from "@sentry/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";

import type { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

type OnErrorOptions = {
  error: TRPCError;
  req?: NextApiRequest;
  res?: NextApiResponse;
};

export function onErrorHandler({ error }: OnErrorOptions) {
  let httpError: HttpError;
  if (error.code) {
    const statusCode = getHTTPStatusCodeFromError(error);
    httpError = new HttpError({ statusCode, message: error.message });
  } else {
    httpError = getServerErrorFromUnknown(error);
  }

  // Log errors that aren't client errors (400s)
  if (httpError.statusCode >= 500) {
    captureException(error);
    console.error("Something went wrong", error);
  }
}
