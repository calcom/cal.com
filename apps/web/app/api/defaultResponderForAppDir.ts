import { wrapApiHandlerWithSentry } from "@sentry/nextjs";
import { captureException } from "@sentry/nextjs";
import type { Params } from "app/_types";
import { ApiError } from "next/dist/server/api-utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { performance } from "@calcom/lib/server/perfObserver";

type Handler<T extends NextResponse | Response = NextResponse> = (
  req: NextRequest,
  { params }: { params: Promise<Params> }
) => Promise<T>;

export const defaultResponderForAppDir = <T extends NextResponse | Response = NextResponse>(
  handler: Handler<T>,
  endpointRoute?: string
) => {
  return async (req: NextRequest, { params }: { params: Promise<Params> }) => {
    let ok = false;
    try {
      performance.mark("Start");

      const result = endpointRoute
        ? await wrapApiHandlerWithSentry(async () => await handler(req, { params }), endpointRoute)()
        : await handler(req, { params });

      ok = true;
      if (result) {
        return result;
      }

      return NextResponse.json({});
    } catch (error) {
      let serverError;

      if (error instanceof ApiError) {
        serverError = {
          message: error.message,
          statusCode: error.statusCode,
          url: req.url,
          method: req.method,
        };
      } else {
        serverError = getServerErrorFromUnknown(error);
      }

      // Don't report 400-499 errors to Sentry/console
      if (!(serverError.statusCode >= 400 && serverError.statusCode < 500)) {
        console.error(serverError);
        captureException(error);
      }

      return NextResponse.json(
        {
          message: serverError.message,
          url: serverError.url,
          method: serverError.method,
        },
        {
          status: serverError.statusCode,
        }
      );
    } finally {
      performance.mark("End");
      performance.measure(`[${ok ? "OK" : "ERROR"}][${req.method}] '${req.url}'`, "Start", "End");
    }
  };
};
