import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@lib/prisma";

const TRIAL_LIMIT_DAYS = 14;

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

  await prisma.user.updateMany({
    data: {
      plan: "FREE",
    },
    where: {
      plan: "TRIAL",
      createdDate: {
        lt: dayjs().subtract(TRIAL_LIMIT_DAYS, "day").toDate(),
      },
    },
  });
  res.json({ ok: true });
}
