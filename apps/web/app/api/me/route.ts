import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { performance } from "@calcom/lib/server/perfObserver";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

let isCold = true;

export async function GET() {
  const prePrismaDate = performance.now();
  const prisma = (await import("@calcom/prisma")).default;
  const preSessionDate = performance.now();

  // Create a legacy request object for compatibility
  const legacyReq = buildLegacyRequest(headers(), cookies());

  const session = await getServerSession({ req: legacyReq });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 409 });
  }

  const preUserDate = performance.now();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ message: "No user found" }, { status: 404 });
  }

  const lastUpdate = performance.now();

  // Create response with headers
  const response = NextResponse.json({
    message: `Hello ${user.name}`,
    prePrismaDate,
    prismaDuration: `Prisma took ${preSessionDate - prePrismaDate}ms`,
    preSessionDate,
    sessionDuration: `Session took ${preUserDate - preSessionDate}ms`,
    preUserDate,
    userDuration: `User took ${lastUpdate - preUserDate}ms`,
    lastUpdate,
    wasCold: isCold,
  });

  // Set custom header
  response.headers.set("x-is-cold", isCold.toString());
  isCold = false;

  return response;
}
