import type { NextApiRequest, NextApiResponse } from "next";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import { metadata } from "../metadata.generated";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const state = decodeOAuthState(req);
  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ??
      getInstalledAppPath({ variant: metadata.variant, slug: metadata.slug })
  );
}
