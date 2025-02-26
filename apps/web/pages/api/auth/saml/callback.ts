import type { NextApiRequest, NextApiResponse } from "next";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { oauthController } = await jackson();

  const { redirect_url } = await oauthController.samlResponse(req.body);

  if (redirect_url) {
    res.redirect(302, redirect_url);
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
