import { wrapApiHandlerWithSentry } from "@sentry/nextjs";
import { captureException } from "@sentry/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";
import { performance } from "./perfObserver";

type Handle<T> = (req: NextApiRequest, res: NextApiResponse) => Promise<T>;

/** Allows us to get type inference from API handler responses */
export function defaultResponder<T>(
  f: Handle<T>,
  /** If set we will wrap the handle with sentry tracing */
  endpointRoute?: string
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let ok = false;
    try {
      performance.mark("Start");
      const result = endpointRoute
        ? await wrapApiHandlerWithSentry(f, endpointRoute)(req, res)
        : await f(req, res);
      ok = true;
      if (result && !res.writableEnded) {
        return res.json(result);
      }
    } catch (err) {
      const error = getServerErrorFromUnknown(err);
      // we don't want to report Bad Request errors to Sentry / console
      if (!(error.statusCode >= 400 && error.statusCode < 500)) {
        console.error(error);
        captureException(error);
      }
      return res
        .status(error.statusCode)
        .json({ message: error.message, url: error.url, method: error.method, data: error?.data || null });
    } finally {
      performance.mark("End");
      performance.measure(`[${ok ? "OK" : "ERROR"}][$1] ${req.method} '${req.url}'`, "Start", "End");
    }
  };
}
