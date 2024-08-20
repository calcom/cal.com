import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "../../middleware";

export default withMiddleware("verifyCrmToken")(
  defaultHandler({
    GET: import("./_get"),
  })
);
