import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";

const scopes = ["OnlineMeetings.ReadWrite", "offline_access"];

let client_id = "";
let client_secret = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (typeof code !== "string") {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          `${WEBAPP_URL}/apps/installed`
      );
      return;
    }
    res.status(400).json({ message: "No code returned" });
    return;
  }

  const appKeys = await getAppKeysFromSlug("msteams");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
  if (!client_id) return res.status(400).json({ message: "Office 365 client_id missing." });
  if (!client_secret) return res.status(400).json({ message: "Office 365 client_secret missing." });

  const toUrlEncoded = (payload: Record<string, string>) =>
    Object.keys(payload)
      .map((key) => `${key}=${encodeURIComponent(payload[key])}`)
      .join("&");

  const body = toUrlEncoded({
    client_id,
    grant_type: "authorization_code",
    code,
    scope: scopes.join(" "),
    redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/office365video/callback`,
    client_secret,
  });

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  const responseBody = await response.json();

  if (!response.ok) {
    return res.redirect(`/apps/installed?error=${JSON.stringify(responseBody)}`);
  }

  const whoami = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${responseBody.access_token}` },
  });
  const graphUser = await whoami.json();

  // In some cases, graphUser.mail is null. Then graphUser.userPrincipalName most likely contains the email address.
  responseBody.email = graphUser.mail ?? graphUser.userPrincipalName;
  responseBody.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in); // set expiry date in seconds
  delete responseBody.expires_in;

  const userId = req.session?.user.id;
  if (!userId) {
    return res.status(404).json({ message: "No user found" });
  }

  /**
   * With this we take care of no duplicate office365_video key for a single user
   * when creating a video room we only do findFirst so the if they have more than 1
   * others get ignored
   * */
  const existingCredentialOfficeVideo = await prisma.credential.findMany({
    select: {
      id: true,
    },
    where: {
      type: "office365_video",
      userId: req.session?.user.id,
      appId: "msteams",
    },
  });

  // Making sure we only delete office365_video
  const credentialIdsToDelete = existingCredentialOfficeVideo.map((item) => item.id);
  if (credentialIdsToDelete.length > 0) {
    await prisma.credential.deleteMany({ where: { id: { in: credentialIdsToDelete }, userId } });
  }

  await createOAuthAppCredential({ appId: "msteams", type: "office365_video" }, responseBody, req);

  return res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "conferencing", slug: "msteams" })
  );
}
