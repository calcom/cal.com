import type { NextApiRequest, NextApiResponse } from "next";

import { downgradeIllegalProUsers } from "@ee/lib/stripe/team-billing";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session || !session.user || !session.user.email) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // check if peer or bailey
  const isPeerOrBailey = ["peer", "bailey", "pro"].includes(session.user.username);
  if (!isPeerOrBailey) {
    res.status(500).json({ error: "not peer or bailey" });
    return;
  }

  const stats = await downgradeIllegalProUsers();

  return res.status(200).json(stats);
}
