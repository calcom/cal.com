import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

const log = logger.getSubLogger({ prefix: ["cron:migrate-billing"] });

const querySchema = z.object({
  lookbackHours: z.coerce.number().min(1).max(168).optional().default(24), // Default 24 hours, max 1 week
});

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { lookbackHours } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const lookbackDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  log.info(`Starting billing migration for bookings created since ${lookbackDate.toISOString()}`);

  try {
    const recentBookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: lookbackDate,
        },
        eventType: {
          teamId: {
            not: null,
          },
        },
      },
      select: {
        eventType: {
          select: {
            teamId: true,
          },
        },
      },
      distinct: ["eventTypeId"],
    });

    const uniqueTeamIds = Array.from(
      new Set(
        recentBookings
          .map((booking) => booking.eventType?.teamId)
          .filter((teamId): teamId is number => teamId !== null && teamId !== undefined)
      )
    );

    log.info(`Found ${uniqueTeamIds.length} unique teams from recent bookings`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ teamId: number; error: string }> = [];

    for (const teamId of uniqueTeamIds) {
      try {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: {
            id: true,
            isOrganization: true,
            metadata: true,
            teamBilling: true,
            organizationBilling: true,
          },
        });

        if (!team) {
          log.warn(`Team ${teamId} not found, skipping`);
          skippedCount++;
          continue;
        }

        const alreadyMigrated = team.isOrganization
          ? team.organizationBilling !== null
          : team.teamBilling !== null;

        if (alreadyMigrated) {
          log.debug(`Team ${teamId} already has billing record, skipping`);
          skippedCount++;
          continue;
        }

        const metadata = teamMetadataStrictSchema.parse(team.metadata || {});

        if (!metadata.subscriptionId || !metadata.subscriptionItemId) {
          log.debug(`Team ${teamId} has no subscription data in metadata, skipping`);
          skippedCount++;
          continue;
        }

        const billingData = {
          teamId: team.id,
          subscriptionId: metadata.subscriptionId,
          subscriptionItemId: metadata.subscriptionItemId,
          customerId: metadata.paymentId || "", // Use paymentId as customerId fallback
          status: "ACTIVE", // Default status, could be refined
          planName: team.isOrganization ? "ORGANIZATION" : "TEAM",
          subscriptionStart: metadata.subscriptionStartDate
            ? new Date(metadata.subscriptionStartDate)
            : undefined,
          subscriptionTrialEnd: metadata.subscriptionTrialEndDate
            ? new Date(metadata.subscriptionTrialEndDate)
            : undefined,
          subscriptionEnd: metadata.subscriptionEndDate ? new Date(metadata.subscriptionEndDate) : undefined,
        };

        if (team.isOrganization) {
          await prisma.organizationBilling.create({
            data: billingData,
          });
          log.info(`Migrated organization ${teamId} to OrganizationBilling table`);
        } else {
          await prisma.teamBilling.create({
            data: billingData,
          });
          log.info(`Migrated team ${teamId} to TeamBilling table`);
        }

        migratedCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({ teamId, error: errorMessage });
        log.error(`Failed to migrate team ${teamId}: ${errorMessage}`);
      }
    }

    const summary = {
      ok: true,
      lookbackHours,
      lookbackDate: lookbackDate.toISOString(),
      teamsFound: uniqueTeamIds.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors,
    };

    log.info(`Billing migration completed: ${safeStringify(summary)}`);

    return NextResponse.json(summary);
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
