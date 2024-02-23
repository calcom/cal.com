import { Redis } from "@upstash/redis";
import { createHash } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server";

const generateHash = (data: string): string => {
  return createHash("sha256").update(data).digest("hex");
};

const redis = Redis.fromEnv();

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const userIp = getIP(req);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });

  const session = await getServerSession({ req, res });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;

  const requestBody = JSON.stringify({ ...req.body, userIp });
  const idempotencyKey = generateHash(requestBody);

  try {
    const checkIfKeyExist = await redis.exists(idempotencyKey);
    if (checkIfKeyExist) {
      return res.status(429).json({ message: "Request Already Processing" });
    }

    await redis.set(idempotencyKey, "1");
    const booking = await handleNewBooking(req);
    await redis.del(idempotencyKey);

    return booking;
  } catch (err) {
    // Extract error information
    const responseData = { message: err?.message ?? "Internal Server Error" };
    const statusCode = err?.statusCode ?? 500;

    await redis.del(idempotencyKey);

    // Send the exact error and status code in the response
    return res.status(statusCode).json(responseData);
  }
}

export default defaultResponder(handler);
