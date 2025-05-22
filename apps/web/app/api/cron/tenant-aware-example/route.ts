import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";
import { withMultiTenantPrisma } from "@calcom/prisma/store/withPrismaClient";

async function getHandler() {
  return NextResponse.json({
    users: await prisma.user.count(),
    bookings: await prisma.booking.count(),
  });
}
export const GET = withMultiTenantPrisma(getHandler);
