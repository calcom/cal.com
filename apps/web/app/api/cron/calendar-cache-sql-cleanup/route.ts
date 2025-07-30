import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CalendarCacheSqlCleanupService } from "@calcom/features/calendar-cache-sql/CalendarCacheSqlCleanupService";
import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const moduleLogger = logger.getSubLogger({ prefix: ["[api]", "[cron]", "[calendar-cache-sql-cleanup]"] });

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const log = moduleLogger.getSubLogger({ prefix: ["postHandler"] });

  try {
    log.info("Starting calendar cache SQL cleanup cron job");
    const featuresRepo = new FeaturesRepository();
    // Check if cleanup feature is enabled globally
    const isCleanupEnabled = await featuresRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-cleanup");
    if (!isCleanupEnabled) {
      log.debug("Calendar cache SQL cleanup not enabled globally");
      return NextResponse.json({ success: false, message: "Cleanup not enabled globally" });
    }

    const eventRepo = new CalendarEventRepository(prisma);

    const cleanupService = new CalendarCacheSqlCleanupService({
      eventRepo,
      featuresRepo,
      logger: log,
    });

    const result = await cleanupService.runCleanup();

    if (result.success) {
      log.info("Calendar cache SQL cleanup cron job completed successfully");
      return NextResponse.json({ success: true, message: "Cleanup completed successfully" });
    } else {
      log.error("Calendar cache SQL cleanup cron job failed", { error: result.error });
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("Calendar cache SQL cleanup cron job failed with exception", { error: errorMessage });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
