import type { NextApiRequest, NextApiResponse } from "next";
import isAuthorized from "pages/api/oAuthAuthorization";

// add middleware function with scrope to authorize JWT token
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const scopes = ["READ_PROFILE"];

    const user = await isAuthorized(req, scopes);

    if (!user) {
      return res.status(401).json("Unauthorized");
    }
    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json("Verification failed");
  }
}
