import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "../../middleware";

export default withMiddleware("verifyManagedSetupCompletionToken")(
  defaultHandler({
    GET: import("./_get"),
  })
);
