import process from "node:process";
import { MonthlyProrationService } from "@calcom/features/ee/billing/service/proration/MonthlyProrationService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { subMonths } from "date-fns";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const log = logger.getSubLogger({ prefix: ["monthly-proration-cron"] });

async function getHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const featuresRepository = new FeaturesRepository(prisma);
  const isEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("monthly-proration");

  if (!isEnabled) {
    return NextResponse.json({ message: "Monthly proration disabled" });
  }

  const requestedMonthKey = request.nextUrl.searchParams.get("monthKey");
  const monthKeyPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (requestedMonthKey && !monthKeyPattern.test(requestedMonthKey)) {
    return NextResponse.json({ message: "Invalid monthKey format. Use YYYY-MM." }, { status: 400 });
  }

  const now = new Date();
  const startOfCurrentMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousMonthUtc = subMonths(startOfCurrentMonthUtc, 1);
  const defaultMonthKey = `${previousMonthUtc.getUTCFullYear()}-${String(
    previousMonthUtc.getUTCMonth() + 1
  ).padStart(2, "0")}`;
  const monthKey = requestedMonthKey || defaultMonthKey;

  log.info(`Processing monthly prorations for ${monthKey}`);

  const prorationService = new MonthlyProrationService();
  const results = await prorationService.processMonthlyProrations({ monthKey });

  return NextResponse.json({
    monthKey,
    processedTeams: results.length,
  });
}

export const GET = getHandler;
