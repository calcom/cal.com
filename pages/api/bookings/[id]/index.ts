import { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "@lib/helpers/withMiddleware";

import authMiddleware from "./_auth-middleware";

export default withMiddleware("HTTP_GET_DELETE_PATCH")(async (req: NextApiRequest, res: NextApiResponse) => {
  await authMiddleware(req, res);
  return defaultHandler({
    GET: import("./_get"),
    PATCH: import("./_patch"),
    DELETE: import("./_delete"),
  })(req, res);
});
