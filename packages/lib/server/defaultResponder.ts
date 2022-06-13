import type { NextApiRequest, NextApiResponse } from "next";
import { performance } from "perf_hooks";

import { perfObserver } from ".";
import { getServerErrorFromUnkown } from "./getServerErrorFromUnkown";

type Handle<T> = (req: NextApiRequest, res: NextApiResponse) => Promise<T>;

perfObserver.observe({ type: "measure" });

/** Allows us to get type inference from API handler responses */
function defaultResponder<T>(f: Handle<T>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      performance.mark("Start");
      const result = await f(req, res);
      res.json(result);
    } catch (err) {
      const error = getServerErrorFromUnkown(err);
      res.statusCode = error.statusCode;
      res.json({ message: error.message });
    } finally {
      performance.mark("End");
      performance.measure("Measuring endpoint: " + req.url, "Start", "End");
    }
  };
}

export default defaultResponder;
