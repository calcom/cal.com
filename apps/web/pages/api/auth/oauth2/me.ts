import type { NextApiRequest, NextApiResponse } from "next";
import isAuthorized from "pages/api/oAuthAuthorization";

// add middleware function with scrope to authorize JWT token
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const scopes = ["READ_PROFILE"];

  const user = await isAuthorized(req, res, scopes);

  if (!user) {
    return res.status(400).send({ message: "User not found" });
  }
  return res.status(201).json(user);
}
