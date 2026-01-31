import type { NextApiRequest, NextApiResponse } from "next";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

const log = logger.getSubLogger({ prefix: ["lawpay", "callback"] });

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { code, error } = req.query;
    const state = decodeOAuthState(req);

    if (error) {
      log.error("OAuth callback error", { error });
      const redirectUrl = getSafeRedirectUrl(state?.onErrorReturnTo) ?? "/apps/lawpay/setup";
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      log.error("Missing authorization code");
      const redirectUrl = getSafeRedirectUrl(state?.onErrorReturnTo) ?? "/apps/lawpay/setup";
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent("missing_code")}`);
    }

    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "You must be logged in to do this" });
    }

    // For LawPay, the OAuth flow should be handled through the setup page
    // where users manually enter their credentials after obtaining them from LawPay
    log.info("OAuth callback received, redirecting to setup", { code: typeof code });

    const redirectUrl = getSafeRedirectUrl(state?.returnTo) ?? "/apps/lawpay/setup";
    res.redirect(`${redirectUrl}?success=true`);
  } catch (error) {
    log.error("Error in OAuth callback", getErrorFromUnknown(error));
    res.status(500).json({ message: "Internal server error" });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
