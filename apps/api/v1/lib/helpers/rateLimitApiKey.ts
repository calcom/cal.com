import type { NextMiddleware } from "next-api-middleware";

export const rateLimitApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.userId) return res.status(401).json({ message: "No userId provided" });
  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });

  await next();
};
