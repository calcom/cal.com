import { NextMiddleware } from "next-api-middleware";

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
  const apiKey = await prisma.apiKey.findUnique({ where: { id: req.query.apiKey as string } });
  if (!apiKey) {
    res.status(401).json({ error: "Your api key is not valid" });
    throw new Error("No api key found");
  }
  if (apiKey.expiresAt && apiKey.userId && dateInPast(today, apiKey.expiresAt)) {
    res.setHeader("Calcom-User-ID", apiKey.userId);
    await next();
  } else res.status(401).json({ error: "Your api key is not valid" });
};
