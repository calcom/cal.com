import { setUser as SentrySetUser } from "@sentry/nextjs";
import type { NextMiddleware } from "next-api-middleware";

export const captureUserId: NextMiddleware = async (req, res, next) => {
  if (!req.userId) return res.status(401).json({ message: "No userId provided" });

  SentrySetUser({ id: req.userId });

  await next();
};
