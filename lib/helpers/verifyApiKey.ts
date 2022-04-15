import { NextMiddleware } from "next-api-middleware";

import { hashAPIKey } from "@calcom/ee/lib/api/apiKeys";
import prisma from "@calcom/prisma";

// Used to check if the API key is not expired, could be extracted if reused. but not for now.
export const dateInPast = function (firstDate: Date, secondDate: Date) {
  if (firstDate.setHours(0, 0, 0, 0) <= secondDate.setHours(0, 0, 0, 0)) {
    return true;
  }
};
const today = new Date();

// This verifies the API key and sets the user if it is valid.
export const verifyApiKey: NextMiddleware = async (req, res, next) => {
  const pathIsDocs = req.url?.startsWith("/docs");
  if (pathIsDocs) await next();
  if (!req.query.apiKey) res.status(401).json({ message: "No API key provided" });

  const strippedApiKey = `${req.query.apiKey}`.replace(process.env.API_KEY_PREFIX || "cal_", "");
  const hashedKey = hashAPIKey(strippedApiKey);
  await prisma.apiKey
    .findUnique({ where: { hashedKey } })
    .then(async (apiKey) => {
      if (!apiKey) {
        res.status(401).json({ error: "You did not provide an api key" });
        throw new Error("No api key found");
      }
      if (apiKey.userId) res.setHeader("X-Calcom-User-ID", apiKey.userId);
      if (apiKey.expiresAt && apiKey.userId && dateInPast(today, apiKey.expiresAt)) await next();
    })
    .catch((error) => {
      res.status(401).json({ error: "Your api key is not valid" });
    });
};
