import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "querystring";
import prisma from "../../../../../lib/prisma";

const BASE_URL = process.env.BASE_URL;
const scopes = ["offline_access", "Calendars.Read", "Calendars.ReadWrite" /*"Calendars.Read.Shared"*/];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  console.log("\n ==> req.query =", req.query);
  const params = parse(state as string);
  console.log(params);

  if (typeof code !== "string") {
    res.status(400).json({ message: "No code returned" });
    return;
  }

  const toUrlEncoded = (payload: Record<string, string>) =>
    Object.keys(payload)
      .map((key) => key + "=" + encodeURIComponent(payload[key]))
      .join("&");

  const body = toUrlEncoded({
    client_id: process.env.MS_GRAPH_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    scope: scopes.join(" "),
    redirect_uri: BASE_URL + `/api/amili/integration/office365calendar/callback`,
    client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
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
    let redirectURLError = "";
    if (params.isCoachUser === "true") {
      redirectURLError =
        params.isSetupPage === "true"
          ? `${process.env.COACH_DASHBOARD_URL}/app/setup-account/integrate?isSetupDone=false`
          : `${process.env.COACH_DASHBOARD_URL}/app/schedule?isSetting=true`;
    } else {
      redirectURLError = `${process.env.AMILI_BASE_URL}/dashboard/coach-system/users/${params.coachId}`;
    }
    return res.redirect(`${redirectURLError}?error=` + JSON.stringify(responseBody));
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
      userId: +params.assUserId,
    },
  });

  console.log("responseBody", responseBody);

  let redirectURL = "";
  if (params.isCoachUser === "true") {
    redirectURL =
      params.isSetupPage === "true"
        ? `${process.env.COACH_DASHBOARD_URL}/app/setup-account/integrate?isSetupDone=false`
        : `${process.env.COACH_DASHBOARD_URL}/app/schedule?isSetting=true`;
  } else {
    redirectURL = `${process.env.AMILI_BASE_URL}/dashboard/coach-system/users/${params.coachId}`;
  }
  return res.redirect(redirectURL);
  // return res.status(200).json({ redirectURL });
}
