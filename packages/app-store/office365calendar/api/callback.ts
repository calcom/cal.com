import type { NextApiRequest, NextApiResponse } from "next";

import { BASE_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { decodeOAuthState } from "../../_utils/decodeOAuthState";

const scopes = ["offline_access", "Calendars.Read", "Calendars.ReadWrite"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (typeof code !== "string") {
    res.status(400).json({ message: "No code returned" });
    return;
  }

  const toUrlEncoded = (payload: Record<string, string>) =>
    Object.keys(payload)
      .map((key) => key + "=" + encodeURIComponent(payload[key]))
      .join("&");

  const body = toUrlEncoded({
    client_id: process.env.MS_GRAPH_CLIENT_ID!,
    grant_type: "authorization_code",
    code,
    scope: scopes.join(" "),
    redirect_uri: BASE_URL + "/api/integrations/office365calendar/callback",
    client_secret: process.env.MS_GRAPH_CLIENT_SECRET!,
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
    return res.redirect("/apps/installed?error=" + JSON.stringify(responseBody));
  }

  const whoami = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: "Bearer " + responseBody.access_token },
  });
  const graphUser = await whoami.json();

  // In some cases, graphUser.mail is null. Then graphUser.userPrincipalName most likely contains the email address.
  responseBody.email = graphUser.mail ?? graphUser.userPrincipalName;
  responseBody.expiry_date = Math.round(+new Date() / 1000 + responseBody.expires_in); // set expiry date in seconds
  delete responseBody.expires_in;

  await prisma.credential.create({
    data: {
      type: "office365_calendar",
      key: responseBody,
      userId: req.session?.user.id,
    },
  });

  const state = decodeOAuthState(req);
  return res.redirect(state?.returnTo ?? "/apps/installed");
}
