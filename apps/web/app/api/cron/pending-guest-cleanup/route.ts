import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const expiryDate = dayjs().subtract(48, "hours").toDate();

  const deleted = await prisma.pendingGuest.deleteMany({
    where: {
      createdAt: {
        lte: expiryDate,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    count: deleted.count,
    cleanedBefore: expiryDate.toISOString(),
  });
}

export const POST = defaultResponderForAppDir(postHandler);
