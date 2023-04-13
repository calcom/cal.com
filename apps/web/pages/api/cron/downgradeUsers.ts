import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  page: z.coerce.number().min(0).optional().default(0),
});

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

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const pageSize = 90; // Adjust this value based on the total number of teams and the available processing time
  let { page: pageNumber } = querySchema.parse(req.query);

  while (true) {
    const teams = await prisma.team.findMany({
      where: {
        slug: {
          not: null,
        },
      },
      select: {
        id: true,
      },
      skip: pageNumber * pageSize,
      take: pageSize,
    });

    if (teams.length === 0) {
      break;
    }

    for (const team of teams) {
      await updateQuantitySubscriptionFromStripe(team.id);
      await delay(100); // Adjust the delay as needed to avoid rate limiting
    }

    pageNumber++;
  }

  res.json({ ok: true });
}
