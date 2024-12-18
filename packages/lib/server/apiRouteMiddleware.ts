import { captureException } from "@sentry/nextjs";
import { ApiError } from "next/dist/server/api-utils";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";

export const apiRouteMiddleware =
  (...handlers: ((req: Request, res?: Response) => Promise<Response>)[]) =>
  async (req: NextRequest, res: NextResponse) => {
    try {
      for (const handler of handlers) {
        await handler(req, res);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ message: error.message }, { status: error.statusCode });
      } else {
        const serverError = getServerErrorFromUnknown(error);
        // we don't want to report Bad Request errors to Sentry / console
        if (!(serverError.statusCode >= 400 && serverError.statusCode < 500)) {
          console.error(error);
          captureException(error);
        } else {
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
        return new Response("Something went wrong", { status: 500 });
      }
    }
  };
