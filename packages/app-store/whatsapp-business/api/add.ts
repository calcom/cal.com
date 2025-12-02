// import { OAuth2Client } from "googleapis-common";
import type { NextApiRequest, NextApiResponse } from "next";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { GOOGLE_CALENDAR_SCOPES, SCOPE_USERINFO_PROFILE, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import appConfig from "../config.json";
import { getWhatsAppBusinessAppKeys } from "../lib/getWhatsAppBusinessAppKeys";

// const handler: AppDeclarativeHandler = {
//   appType: appConfig.type,
//   variant: appConfig.variant,
//   slug: appConfig.slug,
//   supportsMultipleInstalls: false,
//   handlerType: "add",
//   createCredential: ({ appType, user, slug, teamId, calIdTeamId }) =>
//     createDefaultInstallation({ appType, user: user, slug, key: {}, teamId, calIdTeamId }),
// };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const loggedInUser = req.session?.user;

    if (!loggedInUser) {
      throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
    }

    // Ideally this should never happen, as email is there in session user but typings aren't accurate it seems
    // TODO: So, confirm and later fix the typings
    if (!loggedInUser.email) {
      throw new HttpError({ statusCode: 400, message: "Session user must have an email" });
    }

    const { client_id, client_secret } = await getWhatsAppBusinessAppKeys();
    const redirect_uri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/whatsapp-business/callback`;

    const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${client_id}&redirect_uri=${encodeURIComponent(
      redirect_uri
    )}&response_type=code&scope=whatsapp_business_management,whatsapp_business_messaging&state=${encodeOAuthState(
      req
    )}`;

    // &state=RANDOM_CSRF_TOKEN&auth_type=rerequest

    // const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

    // const authUrl = oAuth2Client.generateAuthUrl({
    //   access_type: "offline",
    //   scope: [SCOPE_USERINFO_PROFILE, ...GOOGLE_CALENDAR_SCOPES],
    //   // A refresh token is only returned the first time the user
    //   // consents to providing access.  For illustration purposes,
    //   // setting the prompt to 'consent' will force this consent
    //   // every time, forcing a refresh_token to be returned.
    //   prompt: "consent",
    //   state: encodeOAuthState(req),
    // });

    res.status(200).json({ url: url });
  }
}
