import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "querystring";
import prisma from "../../../../../lib/prisma";

const credentials = process.env.GOOGLE_API_CREDENTIALS;
const BASE_URL = process.env.BASE_URL;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  console.log("\n ==> req.query =", req.query);
  const params = parse(state as string);
  console.log(params);

  if (code && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }
  if (!credentials) {
    res.status(400).json({ message: "There are no Google Credentials installed." });
    return;
  }

  const { client_secret, client_id } = JSON.parse(credentials).web;
  const redirect_uri = BASE_URL + "/api/amili/integration/googlecalendar/callback";

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  let key = "";

  const newCode = code as string;

  if (newCode) {
    const token = await oAuth2Client.getToken(newCode);

    key = token.res?.data;
  }

  await prisma.credential.create({
    data: {
      type: "google_calendar",
      key,
      userId: +params.assUserId,
    },
  });

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
}
