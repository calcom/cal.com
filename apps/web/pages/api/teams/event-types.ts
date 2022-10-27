import type { NextApiRequest, NextApiResponse } from "next";

import { getTeamEventsWithMembers } from "@calcom/lib/server/queries/teams";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { teams } = await getTeamEventsWithMembers();
  return res.status(200).json({ teams });
}
