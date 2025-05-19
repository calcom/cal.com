import { NextResponse } from "next/server";

import { withMultiTenantPrisma } from "@calcom/prisma/store/withPrismaClient";

export async function GET() {
  const results = await withMultiTenantPrisma(async (clients) => {
    const stats: Record<string, { users: number; bookings: number }> = {};

    for (const [tenant, prisma] of Object.entries(clients)) {
      stats[tenant] = {
        users: await prisma.user.count(),
        bookings: await prisma.booking.count(),
      };
    }

    return stats;
  });

  return NextResponse.json(results);
}
