import { OAuth2Client } from "googleapis-common";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { getGoogleSheetsAppKeys } from "../lib/getGoogleSheetsAppKeys";

// Google Sheets API scope for full spreadsheet access
const GOOGLE_SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const loggedInUser = req.session?.user;

  if (!loggedInUser) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  if (!loggedInUser.email) {
    throw new HttpError({ statusCode: 400, message: "Session user must have an email" });
  }

  const { client_id, client_secret } = await getGoogleSheetsAppKeys();
  const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlesheets/callback`;
  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SHEETS_SCOPES,
    prompt: "consent",
    state: encodeOAuthState(req),
  });

  res.status(200).json({ url: authUrl });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});