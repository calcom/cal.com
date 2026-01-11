import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getTeamBillingServiceFactory } from "@calcom/features/ee/billing/di/containers/Billing";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  page: z.coerce.number().min(0).optional().default(0),
});

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const pageSize = 90; // Adjust this value based on the total number of teams and the available processing time

  let { page: pageNumber } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

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

    const teamBillingFactory = getTeamBillingServiceFactory();
    const teamsBilling = teamBillingFactory.initMany(teams);
    const teamBillingPromises = teamsBilling.map((teamBilling) => teamBilling.updateQuantity());
    await Promise.allSettled(teamBillingPromises);

    pageNumber++;
  }

  return NextResponse.json({ ok: true });
}

export const POST = defaultResponderForAppDir(postHandler);
