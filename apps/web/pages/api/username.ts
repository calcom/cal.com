import type { NextApiRequest, NextApiResponse } from "next";

import { checkUsername } from "@calcom/lib/server/checkUsername";

type Response = {
  available: boolean;
  premium: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  const result = await checkUsername(req.body.username);
  return res.status(200).json(result);
}
