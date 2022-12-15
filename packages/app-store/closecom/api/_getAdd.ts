import type { NextApiRequest, NextApiResponse } from "next";

import checkSession from "../../_utils/auth";
import { checkInstalled } from "../../_utils/installation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  await checkInstalled("closecom", session.user?.id);
  return res.status(200).json({ url: "/apps/closecom/setup" });
}
