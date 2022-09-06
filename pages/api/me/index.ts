import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "@lib/helpers/withMiddleware";

export default withMiddleware("HTTP_GET")(
  defaultHandler({
    GET: import("./_get"),
  })
);
