import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { revalidateCalendarCache } from "@calcom/lib/server/revalidateCalendarCache";

const querySchema = z.object({
  username: z.string(),
});

/**
 * This endpoint revalidates users calendar cache several months ahead
 * Can be used as webhook
 * @param req
 * @param res
 * @returns
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username } = querySchema.parse(req.query);
  try {
    await revalidateCalendarCache(res.revalidate, username);

    return res.status(200).json({ revalidated: true });
  } catch (err) {
    return res.status(500).send({ message: "Error revalidating" });
  }
}
