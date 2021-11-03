import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";

import { encodeOAuthState } from "../utils";

const scopes = ["User.Read", "Calendars.Read", "Calendars.ReadWrite", "offline_access"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Check that user is authenticated
    const session = await getSession({ req: req });

    if (!session?.user) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const state = encodeOAuthState(req);
    let url =
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code&scope=" +
      scopes.join(" ") +
      "&client_id=" +
      process.env.MS_GRAPH_CLIENT_ID +
      "&redirect_uri=" +
      process.env.BASE_URL +
      "/api/integrations/office365calendar/callback";
    if (state) {
      url += "&state=" + encodeURIComponent(state);
    }
    res.status(200).json({ url });
  }
}
