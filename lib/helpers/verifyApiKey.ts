import { NextMiddleware } from "next-api-middleware";

import { hashAPIKey } from "@calcom/ee/lib/api/apiKeys";
import prisma from "@calcom/prisma";

// Used to check if the API key is not expired, could be extracted if reused. but not for now.
export const dateInPast = function (date: Date) {
  const now = new Date();
  if (now.setHours(0, 0, 0, 0) <= date.setHours(0, 0, 0, 0)) {
    return true;
  }
};

// This verifies the API key and sets the user if it is valid.
export const verifyApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.query.apiKey) res.status(401).json({ message: "No api key provided" });
  // We remove the prefix from the user provided api_key. If no env set default to "cal_"
  const strippedApiKey = `${req.query.apiKey}`.replace(process.env.API_KEY_PREFIX || "cal_", "");
  // Hash the key again before matching against the database records.
  const hashedKey = hashAPIKey(strippedApiKey);
  // Check if the hashed api key exists in database.
  await prisma.apiKey.findUnique({ where: { hashedKey } }).then(async (apiKey) => {
    // If we cannot find any api key. Throw a 401 Unauthorized.
    if (!apiKey) res.status(401).json({ error: "Your api key is not valid" });
    if (apiKey && apiKey.expiresAt && dateInPast(apiKey.expiresAt) && apiKey.userId) {
      // Right now API Keys are user centric, we only allow resources related to this userId throughout the application.
      // if the api key is not expired, and the user id is present in the database.
      // Set the user in the request. as x-calcom-user-id.
      res.setHeader("X-Calcom-User-ID", apiKey.userId);
      // Pass the request to the next middleware.
      await next();
    }
  });
};
