import { defaultHandler } from "@calcom/lib/server/defaultHandler";

export default defaultHandler({
  GET: import("./_getAdd"),
});
