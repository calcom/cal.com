import type { NextApiHandler } from "next";

import { HttpError } from "../http-error";
import { rateLimiter } from "../rateLimit";

export const rateLimitHandler: NextApiHandler = async (req) => {
  const apiKey = req.headers.authorization || req.query.apiKey;
  const { remaining, reset } = await rateLimiter()({
    rateLimitingType: "api",
    identifier: `${apiKey}`,
  });

  if (remaining < 1) {
    const convertToSeconds = (ms: number) => Math.floor(ms / 1000);
    const secondsToWait = convertToSeconds(reset - Date.now());
    throw new HttpError({
      statusCode: 429,
      message: `Rate limit exceeded. Try again in ${secondsToWait} seconds.`,
    });
  }
};
