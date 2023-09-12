import type { NextApiRequest, NextApiResponse } from "next";
import isAuthorized from "pages/api/oAuthAuthorization";

// add middleware function with scrope to authorize JWT token
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const requriedScopes = ["READ_PROFILE"];

    const user = await isAuthorized(req, requriedScopes);

    return res.status(201).json(user);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}
