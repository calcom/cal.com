import type { PrismaClient } from "@calcom/prisma";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import { Plan, SubscriptionStatus } from "../repository/IBillingRepository";
import { BillingRepositoryFactory } from "../repository/billingRepositoryFactory";

export interface BillingMigrationResult {
  ok: boolean;
  lookbackHours: number;
  lookbackDate: string;
  teamsFound: number;
  migrated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ teamId: number; error: string }>;
}

export interface BillingMigrationInput {
  lookbackHours: number;
}

interface TeamForMigration {
  id: number;
  isOrganization: boolean;
  metadata: unknown;
  teamBilling: { id: string } | null;
  organizationBilling: { id: string } | null;
}

export class BillingMigrationService {
  constructor(private readonly prismaClient: PrismaClient) {}

  async migrateTeamBillingFromBookings(input: BillingMigrationInput): Promise<BillingMigrationResult> {
    const { lookbackHours } = input;
    const lookbackDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const uniqueTeamIds = await this.findTeamIdsFromRecentBookings(lookbackDate);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ teamId: number; error: string }> = [];

    for (const teamId of uniqueTeamIds) {
      try {
        const result = await this.migrateTeamBilling(teamId);
        if (result.migrated) {
          migratedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({ teamId, error: errorMessage });
      }
    }

    return {
      ok: true,
      lookbackHours,
      lookbackDate: lookbackDate.toISOString(),
      teamsFound: uniqueTeamIds.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors,
    };
  }

  private async findTeamIdsFromRecentBookings(lookbackDate: Date): Promise<number[]> {
    const recentBookings = await this.prismaClient.booking.findMany({
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

    return Array.from(
      new Set(
        recentBookings
          .map((booking) => booking.eventType?.teamId)
          .filter((teamId): teamId is number => teamId !== null && teamId !== undefined)
      )
    );
  }

  private async migrateTeamBilling(teamId: number): Promise<{ migrated: boolean; reason?: string }> {
    const team = await this.findTeamForMigration(teamId);

    if (!team) {
      return { migrated: false, reason: "Team not found" };
    }

    if (this.isAlreadyMigrated(team)) {
      return { migrated: false, reason: "Already migrated" };
    }

    const metadata = teamMetadataStrictSchema.parse(team.metadata || {});

    if (!metadata?.subscriptionId || !metadata?.subscriptionItemId) {
      return { migrated: false, reason: "No subscription data in metadata" };
    }

    const billingRepository = BillingRepositoryFactory.getRepository(team.isOrganization);

    await billingRepository.create({
      teamId: team.id,
      subscriptionId: metadata.subscriptionId,
      subscriptionItemId: metadata.subscriptionItemId,
      customerId: metadata.paymentId || "",
      status: SubscriptionStatus.ACTIVE,
      planName: team.isOrganization ? Plan.ORGANIZATION : Plan.TEAM,
    });

    return { migrated: true };
  }

  private async findTeamForMigration(teamId: number): Promise<TeamForMigration | null> {
    return this.prismaClient.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        isOrganization: true,
        metadata: true,
        teamBilling: {
          select: {
            id: true,
          },
        },
        organizationBilling: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  private isAlreadyMigrated(team: TeamForMigration): boolean {
    return team.isOrganization ? team.organizationBilling !== null : team.teamBilling !== null;
  }
}
