import { NextResponse } from "next/server";

import { prisma } from "@calcom/prisma";
import { getPrismaFromHost, runWithTenants } from "@calcom/prisma/store/prismaStore";

export async function GET(req: Request) {
  const host = req.headers.get("host") || "";

  const globalUsers = await prisma.user.findFirst({
    select: { id: true, name: true },
  });

  return runWithTenants(async () => {
    const tenantPrisma = getPrismaFromHost(host);
    const tenantUsers = await tenantPrisma.user.findFirst({
      select: { id: true, name: true },
    });

    return NextResponse.json({
      host,
      globalUsers,
      tenantUsers,
      isSame: globalUsers?.id === tenantUsers?.id,
    });
  });
}
