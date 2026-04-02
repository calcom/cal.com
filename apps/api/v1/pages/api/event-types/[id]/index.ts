import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import type { NextApiRequest, NextApiResponse } from "next";
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
