import { defaultHandler } from "@calcom/lib/server";

export default defaultHandler({
  GET: import("./_getAdd"),
});
