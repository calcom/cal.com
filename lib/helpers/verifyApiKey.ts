import type { IncomingMessage } from "http";
import { NextMiddleware } from "next-api-middleware";

import { hashAPIKey } from "@calcom/ee/lib/api/apiKeys";
import prisma from "@calcom/prisma";

import { isAdminGuard } from "@lib/utils/isAdmin";

/** @todo figure how to use the one from `@calcom/types`ﬁ */
/** @todo: remove once `@calcom/types` is updated with it.*/
declare module "next" {
  export interface NextApiRequest extends IncomingMessage {
    userId: number;
    method: string;
    isAdmin: boolean;
    query: { [key: string]: string | string[] };
  }
}

// Used to check if the apiKey is not expired, could be extracted if reused. but not for now.
export const dateNotInPast = function (date: Date) {
  const now = new Date();
  if (now.setHours(0, 0, 0, 0) > date.setHours(0, 0, 0, 0)) {
    return true;
  }
};

// This verifies the apiKey and sets the user if it is valid.
export const verifyApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });
  // We remove the prefix from the user provided api_key. If no env set default to "cal_"
  const strippedApiKey = `${req.query.apiKey}`.replace(process.env.API_KEY_PREFIX || "cal_", "");
  // Hash the key again before matching against the database records.
  const hashedKey = hashAPIKey(strippedApiKey);
  // Check if the hashed api key exists in database.
  const apiKey = await prisma.apiKey.findUnique({ where: { hashedKey } });
  // If we cannot find any api key. Throw a 401 Unauthorized.
  if (!apiKey) return res.status(401).json({ error: "Your apiKey is not valid" });
  if (apiKey.expiresAt && dateNotInPast(apiKey.expiresAt)) {
    return res.status(401).json({ error: "This apiKey is expired" });
  }
  if (!apiKey.userId) return res.status(404).json({ error: "No user found for this apiKey" });
  /* We save the user id in the request for later use */
  req.userId = apiKey.userId;
  /* We save the isAdmin boolean here for later use */
  req.isAdmin = await isAdminGuard(req.userId);

  await next();
};
