import type { NextApiRequest, NextApiResponse } from "next";

import { checkPremiumUsername } from "@calcom/ee/lib/core/checkPremiumUsername";

type Response = {
  available: boolean;
  premium: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  const result = await checkPremiumUsername(req.body.username);
  return res.status(200).json(result);
}
