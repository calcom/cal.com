import { compose, defaultHandler, defaultResponder, modularize } from "@calcom/lib/server";
import type { Handler } from "@calcom/lib/server/compose";
import prisma from "@calcom/prisma";

import { HttpError } from "@lib/core/http/error";

const getHandler = (handler: Handler) =>
  defaultHandler({
    GET: modularize(handler),
  });

const validateCronApiKey =
  (handler: Handler): Handler =>
  (req, res) => {
    const apiKey = req.headers.authorization || req.query.apiKey;
    if (process.env.CRON_API_KEY !== apiKey) {
      throw new HttpError({ statusCode: 401, message: "Not authenticated" });
    }
    return handler(req, res);
  };

const handler: Handler = async (req, res) => {
  const metrics = await prisma.$metrics.json();
  res.status(200).json(metrics);
  return;
};

export default compose(
  [
    //
    getHandler,
    defaultResponder,
    validateCronApiKey,
  ],
  handler
);
