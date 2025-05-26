import { setUser as SentrySetUser } from "@sentry/nextjs";
import type { NextMiddleware } from "next-api-middleware";

export const captureUserId: NextMiddleware = async (req, res, next) => {
  if (req.userId) SentrySetUser({ id: req.userId });

  await next();
};
