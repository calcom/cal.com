import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

import { withMiddleware } from "~/lib/helpers/withMiddleware";

export default withMiddleware()(
  defaultResponder(async (req: NextApiRequest, res: NextApiResponse) => {
    return defaultHandler({
      GET: import("./_get"),
      PATCH: import("./_patch"),
      DELETE: import("./_delete"),
    })(req, res);
  })
);
