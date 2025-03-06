import { defaultHandler } from "@calcom/lib/server/defaultHandler";

import { withMiddleware } from "~/lib/helpers/withMiddleware";

export default withMiddleware()(
  defaultHandler({
    GET: import("./_get"),
    POST: import("./_post"),
  })
);
