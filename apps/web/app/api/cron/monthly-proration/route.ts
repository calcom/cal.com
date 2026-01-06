import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { MonthlyProrationService } from "@calcom/features/ee/billing/service/proration/MonthlyProrationService";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["cron", "monthly-proration"] });

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;

  log.info(`starting monthly proration processing for ${monthKey}`);

  const prorationService = new MonthlyProrationService();
  const results = await prorationService.processMonthlyProrations({ monthKey });

  log.info(`processed ${results.length} prorations for ${monthKey}`, {
    results: results.map((r) => ({
      prorationId: r.id,
      teamId: r.teamId,
      status: r.status,
      amount: r.proratedAmount,
    })),
  });

  return NextResponse.json({
    ok: true,
    monthKey,
    processedCount: results.length,
  });
}

export const POST = defaultResponderForAppDir(postHandler);
