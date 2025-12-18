import type { NextApiRequest, NextApiResponse } from "next";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { GOOGLE_CALENDAR_SCOPES, SCOPE_USERINFO_PROFILE, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import appConfig from "../config.json";
import { getWhatsAppBusinessAppKeys } from "../lib/getWhatsAppBusinessAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const loggedInUser = req.session?.user;

    if (!loggedInUser) {
      throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
    }

    // Ideally this should never happen, as email is there in session user but typings aren't accurate it seems
    // TODO: So, confirm and later fix the types
    if (!loggedInUser.email) {
      throw new HttpError({ statusCode: 400, message: "Session user must have an email" });
    }

    return res.status(200).json({ url: "/apps/whatsapp-business/setup" });
  }
}
