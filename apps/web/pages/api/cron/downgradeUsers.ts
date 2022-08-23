import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

import { TRIAL_LIMIT_DAYS } from "@lib/config/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  /**
   * TODO:
   * We should add and extra check for non-paying customers in Stripe so we can
   * downgrade them here.
   */

  await prisma.user.updateMany({
    data: {
      plan: "FREE",
    },
    where: {
      plan: "TRIAL",
      OR: [
        /**
         * If the user doesn't have a trial end date,
         * use the default 14 day trial from creation.
         */
        {
          createdDate: {
            lt: dayjs().subtract(TRIAL_LIMIT_DAYS, "day").toDate(),
          },
          trialEndsAt: null,
        },
        /** If it does, then honor the trial end date. */
        {
          trialEndsAt: {
            lt: dayjs().toDate(),
          },
        },
      ],
    },
  });
  res.json({ ok: true });
}
