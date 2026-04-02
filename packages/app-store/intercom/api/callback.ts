import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

const log = logger.getSubLogger({ prefix: [`[[intercom/api/callback]`] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (code && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  let clientId = "";
  let clientSecret = "";
  const appKeys = await getAppKeysFromSlug("intercom");

  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;
  if (!clientId) return res.status(400).json({ message: "Intercom client_id missing." });
  if (!clientSecret) return res.status(400).json({ message: "Intercom client_secret missing." });

  const response = await fetch(`https://api.intercom.io/auth/eagle/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const responseBody = await response.json();

  if (response.status !== 200) {
    log.error("get user_access_token failed", responseBody);
    return res.redirect(`/apps/installed?error=${JSON.stringify(responseBody)}`);
  }

  // Find the admin id from the accompte thanks to access_token and store it
  const admin = await fetch(`https://api.intercom.io/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${responseBody.access_token}`,
    },
  });

  const adminBody = await admin.json();

  if (admin.status !== 200) {
    log.error("get admin_id failed", adminBody);
    return res.redirect(`/apps/installed?error=${JSON.stringify(adminBody)}`);
  }

  const adminId = adminBody.id;

  // Remove the previous credential if admin id was already linked
  await prisma.credential.deleteMany({
    where: {
      type: "intercom_automation",
      key: {
        string_contains: adminId,
      },
    },
  });

  createOAuthAppCredential(
    { appId: "intercom", type: "intercom_automation" },
    JSON.stringify({ access_token: responseBody.access_token, admin_id: adminId }),
    req
  );

  const state = decodeOAuthState(req);

  res.redirect(
    getSafeRedirectUrl(`${WEBAPP_URL}/apps/installed/automation?hl=intercom`) ??
      getInstalledAppPath({ variant: "automation", slug: "intercom" })
  );
}
