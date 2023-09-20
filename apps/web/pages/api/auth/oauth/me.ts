import type { NextApiRequest, NextApiResponse } from "next";

import isAuthorized from "@calcom/features/auth/lib/oAuthAuthorization";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requriedScopes = ["READ_PROFILE"];

  const account = await isAuthorized(req, requriedScopes);

  if (!account) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return res.status(201).json({ username: account.name });
}
