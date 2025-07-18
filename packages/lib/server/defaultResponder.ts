import { wrapApiHandlerWithSentry } from "@sentry/nextjs";
import { captureException } from "@sentry/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { DistributedTracing } from "@calcom/lib/tracing";
import type { TraceContext } from "@calcom/lib/tracing";
import { wrapErrorWithTrace } from "@calcom/lib/tracing/TracedError";

import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";
import { performance } from "./perfObserver";

type TracedRequest = NextApiRequest & {
  traceContext?: TraceContext;
};

type Handle<T> = (req: TracedRequest, res: NextApiResponse) => Promise<T>;

/** Allows us to get type inference from API handler responses */
export function defaultResponder<T>(
  f: Handle<T>,
  /** If set we will wrap the handle with sentry tracing */
  endpointRoute?: string
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let ok = false;
    const operation = endpointRoute?.replace(/^\//, "").replace(/\//g, "_") || "api_request";
    const traceContext = DistributedTracing.createTrace(operation, {
      method: req.method,
      url: req.url,
    });
    const tracingLogger = DistributedTracing.getTracingLogger(traceContext);

    const tracedReq: TracedRequest = { ...req, traceContext };

    try {
      performance.mark("Start");
      tracingLogger.info(`${operation} request started`);

      const result = endpointRoute
        ? await wrapApiHandlerWithSentry(f, endpointRoute)(tracedReq, res)
        : await f(tracedReq, res);
      ok = true;

      tracingLogger.info(`${operation} request completed successfully`);

      if (result && !res.writableEnded) {
        return res.json(result);
      }
    } catch (err) {
      tracingLogger.error(`${operation} request failed`, { error: err });
      const tracedError = wrapErrorWithTrace(err, traceContext);
      const error = getServerErrorFromUnknown(tracedError);
      // we don't want to report Bad Request errors to Sentry / console
      if (!(error.statusCode >= 400 && error.statusCode < 500)) {
        console.error(error);
        captureException(error);
      }
      const errorResponse = {
        message: error.message,
        url: error.url,
        method: error.method,
        data: error?.data || null,
        ...(error?.data &&
          typeof error.data === "object" &&
          "traceId" in error.data &&
          typeof error.data.traceId === "string" && { traceId: error.data.traceId }),
      };

      return res.status(error.statusCode).json(errorResponse);
    } finally {
      performance.mark("End");
      performance.measure(`[${ok ? "OK" : "ERROR"}][$1] ${req.method} '${req.url}'`, "Start", "End");
    }
  };
}
