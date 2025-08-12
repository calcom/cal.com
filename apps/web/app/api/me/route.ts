import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { performance } from "@calcom/lib/server/perfObserver";

import { buildLegacyHeaders, buildLegacyCookies } from "@lib/buildLegacyCtx";

async function getHandler() {
  const prePrismaDate = performance.now();
  const prisma = (await import("@calcom/prisma")).default;
  const preSessionDate = performance.now();

  // Create a legacy request object for compatibility
  const req = {
    headers: buildLegacyHeaders(await headers()),
    cookies: buildLegacyCookies(await cookies()),
  } as any;

  const session = await getServerSession({ req });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 409 });
  }

  const preUserDate = performance.now();
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ message: "No user found" }, { status: 404 });
  }

  const lastUpdate = performance.now();

  const response = NextResponse.json({
    message: `Hello ${user.name}`,
    prePrismaDate,
    prismaDuration: `Prisma took ${preSessionDate - prePrismaDate}ms`,
    preSessionDate,
    sessionDuration: `Session took ${preUserDate - preSessionDate}ms`,
    preUserDate,
    userDuration: `User took ${lastUpdate - preUserDate}ms`,
    lastUpdate,
  });

  return response;
}

export const GET = defaultResponderForAppDir(getHandler);
