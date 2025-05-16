import { NextResponse } from "next/server";

import { withPrismaRoute } from "@calcom/prisma/store/withPrismaRoute";

export const GET = withPrismaRoute(async (req, prisma) => {
  const user = await prisma.user.findFirst({ where: { id: 1 }, select: { id: true, name: true } });
  return NextResponse.json({ user });
});
