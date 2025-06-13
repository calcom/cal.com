import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { postHandler } from "./webhook.handler";

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
