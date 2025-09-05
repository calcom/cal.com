import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { captureException } from "@sentry/nextjs";
import type { TRPCError } from "@trpc/server";
import type { NextApiRequest, NextApiResponse } from "next";

type OnErrorOptions = {
  error: TRPCError;
  req?: NextApiRequest;
  res?: NextApiResponse;
};

export function onErrorHandler({ error }: OnErrorOptions) {
  // Convert any error to a HttpError using our centralized error handling
  const httpError = getServerErrorFromUnknown(error);

  // Log errors that aren't client errors (400s)
  if (httpError.statusCode >= 500) {
    captureException(error);
    console.error("Something went wrong", error);
  }
}
