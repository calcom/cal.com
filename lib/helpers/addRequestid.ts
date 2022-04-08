import { nanoid } from "nanoid";
import { NextMiddleware } from "next-api-middleware";

export const addRequestId: NextMiddleware = async (_req, res, next) => {
  // Apply header with unique ID to every request
  res.setHeader("Calcom-Response-ID", nanoid());
  // Let remaining middleware and API route execute
  await next();
};
