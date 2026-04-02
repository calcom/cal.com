import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { withMiddleware } from "~/lib/helpers/withMiddleware";

export default withMiddleware()(
  defaultHandler({
    POST: import("./_post"),
  })
);
