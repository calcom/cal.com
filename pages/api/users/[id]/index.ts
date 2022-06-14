import { defaultHandler } from "@/../../packages/lib/server";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { withValidQueryIdTransformParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

export default withMiddleware("HTTP_GET_DELETE_PATCH")(
  withValidQueryIdTransformParseInt(
    defaultHandler({
      GET: import("./_get"),
      PATCH: import("./_patch"),
      DELETE: import("./_delete"),
    })
  )
);
