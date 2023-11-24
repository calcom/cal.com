import type { NextApiRequest, NextApiResponse } from "next";

import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import { withPaidAppRedirect } from "../../_utils/paid-apps";
import appConfig from "../config.json";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);

  const redirectUrl = await withPaidAppRedirect({
    appPaidMode: appConfig.paid.mode,
    appSlug: appConfig.slug,
    userId: session.user.id,
    priceId: appConfig.paid.priceId,
  });

  if (!redirectUrl) {
    return res.status(500).json({ message: "Failed to create Stripe checkout session" });
  }

  return { url: redirectUrl };
}

export default defaultResponder(getHandler);
