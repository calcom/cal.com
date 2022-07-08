import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { withValidQueryTeamId } from "@lib/validations/shared/queryTeamId";

export default withMiddleware()(
  withValidQueryTeamId(
    defaultHandler({
      GET: import("./_get"),
      PATCH: import("./_patch"),
      DELETE: import("./_delete"),
    })
  )
);
