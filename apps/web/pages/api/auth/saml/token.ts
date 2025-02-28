import type { NextApiRequest } from "next";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

async function postHandler(req: NextApiRequest) {
  const { oauthController } = await jackson();
  return await oauthController.token(req.body);
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
