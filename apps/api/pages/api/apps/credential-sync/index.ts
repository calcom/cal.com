import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { withMiddleware } from "~/lib/helpers/withMiddleware";

import authMiddleware from "./_auth-middleware";

export default withMiddleware()(
  defaultResponder(async (req: NextApiRequest, res: NextApiResponse) => {
    await authMiddleware(req, res);
    return defaultHandler({
      GET: import("./_get"),
      // POST: import("./post"),
      // DELETE: import("./_delete"),
    })(req, res);
  })
);
