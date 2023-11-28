import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "~/lib/helpers/withMiddleware";

import authMiddleware from "./_auth-middleware";

export default withMiddleware()(async (req: NextApiRequest, res: NextApiResponse) => {
  await authMiddleware(req);
  return defaultHandler({
    DELETE: import("./_delete"),
  })(req, res);
});
