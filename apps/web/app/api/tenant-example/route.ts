import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";

async function handler(req: Request, prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    take: 5,
  });

  return NextResponse.json({
    tenant: req.headers.get("host") || "unknown",
    users,
  });
}

export const GET = withPrismaRoute(handler);
