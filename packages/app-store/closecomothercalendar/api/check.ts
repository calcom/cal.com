import type { NextApiRequest, NextApiResponse } from "next";

import CloseCom from "@calcom/lib/CloseCom";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { apiKey = "" } = req.body;

  if (!apiKey) return res.status(400);

  const closeCom: CloseCom = new CloseCom(apiKey);

  try {
    const userInfo = await closeCom.me();
    if (userInfo.first_name) {
      return res.status(200).end();
    } else {
      return res.status(404).end();
    }
  } catch (e) {
    return res.status(500).json({ error: e });
  }
}
