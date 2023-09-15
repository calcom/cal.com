import type { NextApiRequest, NextApiResponse } from "next";
import isAuthorized from "pages/api/oAuthAuthorization";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requriedScopes = ["READ_PROFILE"];

  const user = await isAuthorized(req, requriedScopes);

  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
  }
  return res.status(201).json(user);
}
