import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "~/lib/helpers/withMiddleware";

export default withMiddleware("HTTP_GET_OR_POST")(
  defaultHandler({
    GET: import("./_get"),
    POST: import("./_post"),
  })
);
