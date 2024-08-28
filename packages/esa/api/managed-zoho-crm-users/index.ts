import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "../../middleware";

export default withMiddleware("verifyCrmToken")(
  defaultHandler({
    GET: import("./_get"),
    POST: import("./_post"),
    PATCH: import("./_patch"),
  })
);
