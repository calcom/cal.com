import type { NextApiRequest, NextApiResponse } from "next";

import Sendgrid from "@calcom/lib/Sendgrid";

import checkSession from "../../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { api_key } = req.body;
    if (!api_key) res.status(400).json({ message: "No Api Key provided to check" });

    checkSession(req);

    const sendgrid: Sendgrid = new Sendgrid(api_key);

    try {
      const usernameInfo = await sendgrid.username();
      if (usernameInfo.username) {
        return res.status(200).end();
      } else {
        return res.status(404).end();
      }
    } catch (e) {
      return res.status(500).json({ message: e });
    }
  }
}
