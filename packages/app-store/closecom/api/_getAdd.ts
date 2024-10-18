import type { NextApiRequest, NextApiResponse } from "next";

import checkSession from "../../_utils/auth";
import { assertNotInstalled } from "../../_utils/installation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  await assertNotInstalled("closecom", session.user?.id);

  const returnTo = req.query.returnTo;

  return res.status(200).json({ url: `/apps/closecom/setup${returnTo ? `?returnTo=${returnTo}` : ""}` });
}
