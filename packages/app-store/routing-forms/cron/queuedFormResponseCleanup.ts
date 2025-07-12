import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";

async function cleanupExpiredQueuedFormResponses(olderThanHours = 1) {
  const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

  const deleted = await prisma.app_RoutingForms_QueuedFormResponse.deleteMany({
    where: {
      AND: [
        {
          actualResponseId: null,
        },
        {
          createdAt: {
            lt: cutoffTime,
          },
        },
      ],
    },
  });

  return { ok: true, count: deleted.count };
}

function validateRequest(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  return null;
}

export async function handleQueuedFormResponseCleanup(request: NextRequest) {
  const authError = validateRequest(request);
  if (authError) {
    return authError;
  }

  const result = await cleanupExpiredQueuedFormResponses(1);

  return NextResponse.json(result);
}
