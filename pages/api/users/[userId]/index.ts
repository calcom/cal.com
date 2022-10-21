import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { withValidQueryUserId } from "@lib/validations/shared/queryUserId";

export default withMiddleware()(
  withValidQueryUserId(
    defaultHandler({
      GET: import("./_get"),
      PATCH: import("./_patch"),
      DELETE: import("./_delete"),
    })
  )
);
