import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import { Plan, SubscriptionStatus } from "../repository/IBillingRepository";
import { BillingRepositoryFactory } from "../repository/billingRepositoryFactory";
import type { TeamBillingRepository } from "../teams/team-billing.repository";
import type { TeamWithBillingRecords } from "../teams/team-billing.repository.interface";

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

export interface IBillingMigrationServiceDeps {
  bookingRepository: BookingRepository;
  teamBillingRepository: TeamBillingRepository;
}

export class BillingMigrationService {
  constructor(private readonly deps: IBillingMigrationServiceDeps) {}

  async migrateTeamBillingFromBookings(input: BillingMigrationInput): Promise<BillingMigrationResult> {
    const { lookbackHours } = input;
    const lookbackDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const uniqueTeamIds = await this.deps.bookingRepository.findDistinctTeamIdsByCreatedDateRange({
      startDate: lookbackDate,
    });

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

  private async migrateTeamBilling(teamId: number): Promise<{ migrated: boolean; reason?: string }> {
    const team = await this.deps.teamBillingRepository.findByIdIncludeBillingRecords(teamId);

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

  private isAlreadyMigrated(team: TeamWithBillingRecords): boolean {
    return team.isOrganization ? team.organizationBilling !== null : team.teamBilling !== null;
  }
}
