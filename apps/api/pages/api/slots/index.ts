import { defaultHandler } from "@calcom/lib/server";

import { withMiddleware } from "~/lib/helpers/withMiddleware";

export const config = {
  memory: 512,
};

export default withMiddleware()(
  defaultHandler({
    GET: import("./_get"),
  })
);
