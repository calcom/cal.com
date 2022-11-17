import { defaultHandler } from "@calcom/lib/server";

export default defaultHandler({
  POST: import("./_postCheck"),
});
