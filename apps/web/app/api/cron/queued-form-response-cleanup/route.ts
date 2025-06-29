import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const deleted = await prisma.app_RoutingForms_QueuedFormResponse.deleteMany({
    where: {
      AND: [
        {
          actualResponseId: null,
        },
        {
          createdAt: {
            lte: oneHourAgo,
          },
        },
      ],
    },
  });

  return NextResponse.json({ ok: true, count: deleted.count });
}

export const POST = defaultResponderForAppDir(postHandler);
