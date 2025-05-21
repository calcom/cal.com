import { NextResponse } from "next/server";

import { prisma } from "@calcom/prisma";
import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";

export const GET = withPrismaRoute(async (req) => {
  const user = await prisma.user.findFirst({ where: { id: 1 }, select: { id: true, name: true } });
  return NextResponse.json({ user });
});
