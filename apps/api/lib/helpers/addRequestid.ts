import { nanoid } from "nanoid";
import type { NextMiddleware } from "next-api-middleware";

export const addRequestId: NextMiddleware = async (_req, res, next) => {
  // Apply header with unique ID to every request
  res.setHeader("Calcom-Response-ID", nanoid());
  // Add all headers here instead of next.config.js as it is throwing error( Cannot set headers after they are sent to the client) for OPTIONS method
  // It is known to happen only in Dev Mode.
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, PATCH, DELETE, POST, PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type, api_key, Authorization"
  );

  // Ensure all OPTIONS request are automatically successful. Headers are already set above.
  if (_req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  // Let remaining middleware and API route execute
  await next();
};
