import { ORGANIZATION_SELF_SERVE_MIN_SEATS, ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

export interface validatePermissionsIOrganizationPermissionService {
  hasPermissionToCreateForEmail(targetEmail: string): Promise<boolean>;
  hasPendingOrganizations(email: string, slug?: string): Promise<boolean>;
  hasPermissionToModifyDefaultPayment(): boolean;
  hasPermissionToMigrateTeams(teamIds: number[]): Promise<boolean>;
  hasModifiedDefaultPayment(input: {
    billingPeriod?: string;
    seats?: number;
    pricePerSeat?: number;
  }): boolean;
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

    return orgOnboarding && orgOnboarding.isComplete;
  }

  hasPermissionToModifyDefaultPayment(): boolean {
    return this.user.role === "ADMIN";
  }

  hasModifiedDefaultPayment(input: {
    billingPeriod?: string;
    seats?: number;
    pricePerSeat?: number;
  }): boolean {
    return (
      (input.billingPeriod !== undefined && input.billingPeriod !== "MONTHLY") ||
      (input.seats !== undefined && input.seats !== ORGANIZATION_SELF_SERVE_MIN_SEATS) ||
      (input.pricePerSeat !== undefined && input.pricePerSeat !== ORGANIZATION_SELF_SERVE_PRICE)
    );
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

  async validatePermissions(input: {
    orgOwnerEmail: string;
    teams?: { id: number; isBeingMigrated: boolean }[];
    billingPeriod?: string;
    seats?: number;
    pricePerSeat?: number;
    slug: string;
  }): Promise<boolean> {
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

    if (this.hasModifiedDefaultPayment(input) && !this.hasPermissionToModifyDefaultPayment()) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to modify the default payment settings",
      });
    }

    const teamsToMigrate = input.teams
      ?.filter((team) => team.id > 0 && team.isBeingMigrated)
      .map((team) => team.id);

    if (teamsToMigrate && !(await this.hasPermissionToMigrateTeams(teamsToMigrate))) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to migrate these teams",
      });
    }

    return true;
  }
}
