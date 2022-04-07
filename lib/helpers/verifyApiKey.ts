import { NextMiddleware } from "next-api-middleware";

import { hashAPIKey } from "@calcom/ee/lib/api/apiKeys";
// import { nanoid } from "nanoid";
import prisma from "@calcom/prisma";

const dateInPast = function (firstDate: Date, secondDate: Date) {
  if (firstDate.setHours(0, 0, 0, 0) <= secondDate.setHours(0, 0, 0, 0)) {
    return true;
  }
};
const today = new Date();

export const verifyApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.query.apiKey) res.status(401).json({ message: "No API key provided" });
  const strippedApiKey = `${req.query.apiKey}`.replace("cal_", "");
  const hashedKey = hashAPIKey(strippedApiKey);
  const apiKey = await prisma.apiKey.findUnique({ where: { hashedKey } });
  if (!apiKey) {
    res.status(401).json({ error: "Your api key is not valid" });
    throw new Error("No api key found");
  }
  if (apiKey.userId) {
    res.setHeader("X-Calcom-User-ID", apiKey.userId);
  }
  if (apiKey.expiresAt && apiKey.userId && dateInPast(today, apiKey.expiresAt)) {
    await next();
  } else res.status(401).json({ error: "Your api key is not valid" });
};
