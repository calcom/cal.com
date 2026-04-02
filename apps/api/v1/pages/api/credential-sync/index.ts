import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { withMiddleware } from "~/lib/helpers/withMiddleware";

export default withMiddleware("verifyCredentialSyncEnabled")(
  defaultHandler({
    GET: import("./_get"),
    POST: import("./_post"),
    PATCH: import("./_patch"),
    DELETE: import("./_delete"),
  })
);
