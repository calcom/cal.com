import { ORGANIZATION_SELF_SERVE_MIN_SEATS, ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

const log = logger.getSubLogger({ prefix: ["ee", "organizations", "OrganizationPermissionService"] });
type SeatsPrice = {
  seats?: number | null;
  pricePerSeat?: number | null;
};

export interface validatePermissionsIOrganizationPermissionService {
  hasPermissionToCreateForEmail(targetEmail: string): Promise<boolean>;
  hasPendingOrganizations(email: string, slug?: string): Promise<boolean>;
  hasPermissionToModifyDefaultPayment(): boolean;
  hasPermissionToMigrateTeams(teamIds: number[]): Promise<boolean>;
  hasModifiedDefaultPayment(
    input: {
      billingPeriod?: string;
    } & SeatsPrice
  ): boolean;
}

export class OrganizationPermissionService {
  constructor(private readonly user: NonNullable<TrpcSessionUser>) {}

  async hasPermissionToCreateForEmail(targetEmail: string): Promise<boolean> {
    return this.user.email === targetEmail || this.user.role === "ADMIN";
  }

  async hasCompletedOnboarding(email: string): Promise<boolean> {
    const orgOnboarding = await prisma.organizationOnboarding.findUnique({
      where: {
        orgOwnerEmail: email,
      },
    });

    return !!(orgOnboarding && orgOnboarding.isComplete);
  }

  hasPermissionToModifyDefaultPayment(): boolean {
    return this.user.role === "ADMIN";
  }

  hasModifiedDefaultPayment(input: SeatsPrice & { billingPeriod?: string }): boolean {
    const isBillingPeriodModified =
      input.billingPeriod !== undefined && input.billingPeriod !== null && input.billingPeriod !== "MONTHLY";

    const isSeatsModified =
      input.seats !== undefined && input.seats !== null && input.seats !== ORGANIZATION_SELF_SERVE_MIN_SEATS;

    const isPricePerSeatModified =
      input.pricePerSeat !== undefined &&
      input.pricePerSeat !== null &&
      input.pricePerSeat !== ORGANIZATION_SELF_SERVE_PRICE;

    log.debug(
      "hasModifiedDefaultPayment",
      safeStringify({ isBillingPeriodModified, isSeatsModified, isPricePerSeatModified })
    );
    return isBillingPeriodModified || isSeatsModified || isPricePerSeatModified;
  }

  async hasPermissionToMigrateTeams(teamIds: number[]): Promise<boolean> {
    if (teamIds.length === 0) return true;

    const teamMemberships = await prisma.membership.findMany({
      where: {
        userId: this.user.id,
        team: {
          id: {
            in: teamIds,
          },
        },
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    return teamMemberships.length === teamIds.length;
  }

  /**
   * Doesn't validate custom price permission as that is validated before onboarding is created and this method also runs when checkout is to be started
   */
  async validatePermissions(
    input: {
      orgOwnerEmail: string;
      teams?: { id: number; isBeingMigrated: boolean }[];
      billingPeriod?: string;
      slug: string;
    } & SeatsPrice
  ): Promise<boolean> {
    if (!(await this.hasPermissionToCreateForEmail(input.orgOwnerEmail))) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to create an organization for this email",
      });
    }

    if (await this.hasCompletedOnboarding(input.orgOwnerEmail)) {
      // TODO: Consider redirecting to success page
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Onboarding already completed",
      });
    }

    const teamsToMigrate = input.teams
      ?.filter((team) => team.id > 0 && team.isBeingMigrated)
      .map((team) => team.id);

    if (teamsToMigrate && !(await this.hasPermissionToMigrateTeams(teamsToMigrate))) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to migrate one or more of the teams",
      });
    }

    return true;
  }
}
