import { captureException } from "@sentry/nextjs";
import { ApiError } from "next/dist/server/api-utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";

export const apiRouteMiddleware =
  (handler: (req: NextRequest, res?: NextResponse) => Promise<NextResponse>) =>
  async (req: NextRequest, res: NextResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ message: error.message }, { status: error.statusCode });
      } else {
        const serverError = getServerErrorFromUnknown(error);
        // we don't want to report Bad Request errors to Sentry / console
        if (!(serverError.statusCode >= 400 && serverError.statusCode < 500)) {
          console.error(error);
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
      }
    }
  };
