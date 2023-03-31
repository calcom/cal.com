import cache from "memory-cache";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cacheKey = "experiment";
  const memory = cache.get(cacheKey);
  if (!memory) {
    cache.put(cacheKey, new Date());
  }
  const totalUsers = await prisma.user.count();
  return NextResponse.json({ coldStart: !Boolean(memory), totalUsers, date: new Date().toISOString() });
}
