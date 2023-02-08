import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";

const querySchema = z.object({
  username: z.string(),
});

export const revalidateCalendarCache = (
  revalidate: NextApiResponse["revalidate"],
  username: string,
  monthsToRevalidate = 4
): Promise<void[]> => {
  return Promise.all(
    new Array(monthsToRevalidate).fill(0).map((_, index): Promise<void> => {
      const date = dayjs().add(index, "month").format("YYYY-MM");
      const url = `/${username}/calendar-cache/${date}`;
      console.log("revalidating", url);
      return revalidate(url);
    })
  );
};

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
