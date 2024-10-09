import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { TeamBilling } from "@calcom/ee/billing/teams";
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
        metadata: true,
        isOrganization: true,
        parentId: true,
      },
      skip: pageNumber * pageSize,
      take: pageSize,
    });

    if (teams.length === 0) {
      break;
    }

    const teamsBilling = TeamBilling.initMany(teams);
    const teamBillingPromises = teamsBilling.map((teamBilling) => teamBilling.updateQuantity());
    await Promise.allSettled(teamBillingPromises);

    pageNumber++;
  }

  res.json({ ok: true });
}
