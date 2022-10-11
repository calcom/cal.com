import { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { withMiddleware } from "@lib/helpers/withMiddleware";

import authMiddleware from "./_auth-middleware";

export default withMiddleware("HTTP_GET_DELETE_PATCH")(
  defaultResponder(async (req: NextApiRequest, res: NextApiResponse) => {
    await authMiddleware(req);
    return defaultHandler({
      GET: import("./_get"),
      PATCH: import("./_patch"),
      DELETE: import("./_delete"),
    })(req, res);
  })
);
