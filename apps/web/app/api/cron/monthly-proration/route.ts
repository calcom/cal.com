import process from "node:process";
import { getMonthlyProrationTasker } from "@calcom/features/ee/billing/di/tasker/MonthlyProrationTasker.container";
import { formatMonthKey } from "@calcom/features/ee/billing/lib/month-key";
import { MonthlyProrationTeamRepository } from "@calcom/features/ee/billing/repository/proration/MonthlyProrationTeamRepository";
import { MONTHLY_PRORATION_BATCH_SIZE } from "@calcom/features/ee/billing/service/proration/tasker/constants";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { ENABLE_ASYNC_TASKER } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { subMonths } from "date-fns";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const log = logger.getSubLogger({ prefix: ["monthly-proration-cron"] });

async function getHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const featuresRepository = new FeaturesRepository(prisma);
  const isEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
    "monthly-proration"
  );

  if (!isEnabled) {
    return NextResponse.json({ message: "Monthly proration disabled" });
  }

  const requestedMonthKey = request.nextUrl.searchParams.get("monthKey");
  const monthKeyPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (requestedMonthKey && !monthKeyPattern.test(requestedMonthKey)) {
    return NextResponse.json(
      { message: "Invalid monthKey format. Use YYYY-MM." },
      { status: 400 }
    );
  }

  const now = new Date();
  const startOfCurrentMonthUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const previousMonthUtc = subMonths(startOfCurrentMonthUtc, 1);
  const defaultMonthKey = formatMonthKey(previousMonthUtc);
  const monthKey = requestedMonthKey || defaultMonthKey;

  // Validate monthKey is not in the future and is within a reasonable range (12 months)
  if (requestedMonthKey) {
    const [year, month] = requestedMonthKey.split("-").map(Number);
    const requestedDate = new Date(Date.UTC(year, month - 1, 1));
    const twelveMonthsAgo = subMonths(startOfCurrentMonthUtc, 12);

    if (requestedDate >= startOfCurrentMonthUtc) {
      return NextResponse.json(
        { message: "monthKey cannot be the current month or in the future." },
        { status: 400 }
      );
    }

    if (requestedDate < twelveMonthsAgo) {
      return NextResponse.json(
        { message: "monthKey cannot be more than 12 months in the past." },
        { status: 400 }
      );
    }
  }

  log.info(`Scheduling monthly proration tasks for ${monthKey}`);

  const teamRepository = new MonthlyProrationTeamRepository(prisma);
  const teamIdsList = await teamRepository.getAnnualTeamsWithSeatChanges(
    monthKey
  );

  if (teamIdsList.length === 0) {
    return NextResponse.json({
      monthKey,
      scheduledTeams: 0,
      scheduledBatches: 0,
      batchSize: MONTHLY_PRORATION_BATCH_SIZE,
    });
  }

  const prorationTasker = getMonthlyProrationTasker();

  const batches: number[][] = [];
  for (
    let index = 0;
    index < teamIdsList.length;
    index += MONTHLY_PRORATION_BATCH_SIZE
  ) {
    batches.push(
      teamIdsList.slice(index, index + MONTHLY_PRORATION_BATCH_SIZE)
    );
  }

  log.info(
    `Scheduling ${teamIdsList.length} teams in ${batches.length} batches for ${monthKey}`
  );

  const isAsyncTaskerEnabled =
    ENABLE_ASYNC_TASKER &&
    process.env.TRIGGER_SECRET_KEY &&
    process.env.TRIGGER_API_URL;

  if (isAsyncTaskerEnabled) {
    await Promise.all(
      batches.map((teamIds) =>
        prorationTasker.processBatch({
          monthKey,
          teamIds,
        })
      )
    );
  } else {
    for (const teamIds of batches) {
      await prorationTasker.processBatch({ monthKey, teamIds });
    }
  }

  return NextResponse.json({
    monthKey,
    scheduledTeams: teamIdsList.length,
    scheduledBatches: batches.length,
    batchSize: MONTHLY_PRORATION_BATCH_SIZE,
  });
}

export const GET = getHandler;
