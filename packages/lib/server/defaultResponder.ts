import type { NextApiRequest, NextApiResponse } from "next";

import { getServerErrorFromUnknown } from "./getServerErrorFromUnknown";
import { performance } from "./perfObserver";

type Handle<T> = (req: NextApiRequest, res: NextApiResponse) => Promise<T>;

/** Allows us to get type inference from API handler responses */
export function defaultResponder<T>(f: Handle<T>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let ok = false;
    try {
      performance.mark("Start");
      const result = await f(req, res);
      ok = true;
      if (result && !res.writableEnded) {
        res.json(result);
      }
    } catch (err) {
      console.error(err);
      const error = getServerErrorFromUnknown(err);
      res.statusCode = error.statusCode;
      // const responseVercelIdHeader =
      //   typeof req.headers?.get === "function"
      //     ? !!req.headers.get("x-vercel-id")
      //     : !!(req.headers as { [key: string]: string })?.["x-vercel-id"];
      const responseVercelIdHeader = "DL4CM";
      console.log({ responseVercelIdHeader });

      res.json({ message: error.message, responseVercelIdHeader });
    } finally {
      performance.mark("End");
      performance.measure(`[${ok ? "OK" : "ERROR"}][$1] ${req.method} '${req.url}'`, "Start", "End");
    }
  };
}
