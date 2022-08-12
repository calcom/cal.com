import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

const scopes = [
  "User.Read",
  "Calendars.Read",
  "Calendars.ReadWrite",
  "offline_access",
  // "Calendars.Read.Shared",
];
const BASE_URL = process.env.BASE_URL;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({});
  } else {
    const reqQuery = stringify(req.query);
    const params = {
      response_type: "code",
      prompt: "select_account",
      scope: scopes.join(" "),
      client_id: process.env.MS_GRAPH_CLIENT_ID,
      redirect_uri: BASE_URL + `/api/amili/integration/office365calendar/callback`,
      state: reqQuery,
    };
    const query = stringify(params);
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`;
    res.status(200).json({ url });
  }
}
