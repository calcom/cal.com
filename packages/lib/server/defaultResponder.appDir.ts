import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import monitorCallbackAsync from "@calcom/core/sentryWrapper";

import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";

type Handle<T> = (req: NextRequest) => Promise<T>;

/** Variant to use in App Router API routes. Allows us to get type inference from API handler responses */
export const defaultResponder =
  <T>(f: Handle<T>) =>
  async (req: NextRequest) => {
    try {
      const result = await monitorCallbackAsync(f, req);
      if (result) {
        return NextResponse.json(result);
      }
    } catch (err) {
      const error = getServerErrorFromUnknown(err);
      // we don't want to report Bad Request errors to Sentry / console
      if (!(error.statusCode >= 400 && error.statusCode < 500)) {
        console.error(err);
        const captureException = (await import("@sentry/nextjs")).captureException;
        captureException(err);
      }
      return NextResponse.json({ message: error.message, url: error.url, method: error.method });
    }
  };
