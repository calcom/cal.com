import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { getSession } from "@lib/auth";
import { BASE_URL } from "@lib/config/constants";
import {
  LARK_OPEN_APP_ID,
  LARK_OPEN_APP_SECRET,
  LARK_HOST,
} from "@lib/integrations/calendar/services/LarkCalendarService/helper";

import { encodeOAuthState } from "../utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Check that user is authenticated
    const session = await getSession({ req });

    if (!session?.user) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const state = encodeOAuthState(req);
    const params = {
      app_id: LARK_OPEN_APP_ID,
      redirect_uri: BASE_URL + "/api/integrations/larkcalendar/callback",
      state,
    };
    const query = stringify(params);
    const url = `https://${LARK_HOST}/open-apis/authen/v1/index?${query}`;

    // trigger app_ticket_immediately
    fetch(`https://${LARK_HOST}/open-apis/auth/v3/app_ticket/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        app_id: LARK_OPEN_APP_ID,
        app_secret: LARK_OPEN_APP_SECRET,
      }),
    });

    res.status(200).json({ url });
  }
}
