import type { NextApiRequest, NextApiResponse } from "next";

import getInstalledAppPath from "@calcom/app-store-core/_utils/getInstalledAppPath";
import { decodeOAuthState } from "@calcom/app-store-core/_utils/oauth/decodeOAuthState";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const state = decodeOAuthState(req);
  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ??
      getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug })
  );
}
