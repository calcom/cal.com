import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";
import { withMultiTenantPrisma } from "@calcom/prisma/store/withMultiTenantPrisma";

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const deleted = await prisma.calendarCache.deleteMany({
    where: {
      // Delete all cache entries that expired before now
      expiresAt: {
        lte: new Date(Date.now()),
      },
    },
  });

  return NextResponse.json({ ok: true, count: deleted.count });
}

export const POST = withMultiTenantPrisma(
  defaultResponderForAppDir(postHandler, {
    disableTenantPrisma: true,
  })
);
