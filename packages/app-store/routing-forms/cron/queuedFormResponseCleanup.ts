import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { PrismaQueuedFormResponseRepository } from "../lib/queuedFormResponse/PrismaQueuedFormResponseRepository";
import { QueuedFormResponseService } from "../lib/queuedFormResponse/QueuedFormResponseService";

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

  try {
    const queuedFormResponseRepo = new PrismaQueuedFormResponseRepository(prisma);
    const queuedFormResponseService = new QueuedFormResponseService({
      logger,
      queuedFormResponseRepo,
    });

    const result = await queuedFormResponseService.cleanupExpiredResponses({
      batchSize: 1000,
    });

    return NextResponse.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error during queued form response cleanup:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to cleanup queued form responses" },
      { status: 500 }
    );
  }
}
