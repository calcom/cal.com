import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "../../middleware";

export default withMiddleware("verifyCrmToken")(
  defaultHandler({
    POST: import("./_post"),
  })
);
