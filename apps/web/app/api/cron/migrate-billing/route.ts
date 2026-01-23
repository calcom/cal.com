import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BillingMigrationService } from "@calcom/features/ee/billing/services/BillingMigrationService";
import { TeamBillingRepository } from "@calcom/features/ee/billing/teams/team-billing.repository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["cron:migrate-billing"] });

const querySchema = z.object({
  lookbackHours: z.coerce.number().min(1).max(168).optional().default(24),
});

function isAuthenticated(request: NextRequest): boolean {
  const headerToken = request.headers.get("authorization");
  const queryToken = request.nextUrl.searchParams.get("apiKey");
  const suppliedToken = headerToken ?? queryToken ?? undefined;

  const allowedTokens = [
    process.env.CRON_API_KEY,
    process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined,
  ].filter(Boolean) as string[];

  if (!suppliedToken || allowedTokens.length === 0 || !allowedTokens.includes(suppliedToken)) {
    return false;
  }

  return true;
}

async function postHandler(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { lookbackHours } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

  log.info(`Starting billing migration with lookback of ${lookbackHours} hours`);

  try {
    const bookingRepository = new BookingRepository(prisma);
    const teamBillingRepository = new TeamBillingRepository();
    const billingMigrationService = new BillingMigrationService({
      bookingRepository,
      teamBillingRepository,
    });
    const result = await billingMigrationService.migrateTeamBillingFromBookings({ lookbackHours });

    log.info(`Billing migration completed: ${safeStringify(result)}`);

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error(`Billing migration failed: ${errorMessage}`);

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export const POST = defaultResponderForAppDir(postHandler);
