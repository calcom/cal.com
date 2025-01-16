import { ORGANIZATION_SELF_SERVE_MIN_SEATS, ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

export interface IOrganizationPermissionService {
  hasPermissionToCreateForEmail(targetEmail: string): Promise<boolean>;
  hasPendingOrganizations(email: string): Promise<boolean>;
  hasPermissionToModifyDefaultPayment(): boolean;
  hasPermissionToMigrateTeams(teamIds: number[]): Promise<boolean>;
  hasModifiedDefaultPayment(input: {
    billingPeriod?: string;
    seats?: number;
    pricePerSeat?: number;
  }): boolean;
}

export class OrganizationPermissionService implements IOrganizationPermissionService {
  constructor(private readonly user: NonNullable<TrpcSessionUser>) {}

  async hasPermissionToCreateForEmail(targetEmail: string): Promise<boolean> {
    return this.user.email === targetEmail || this.user.role === "ADMIN";
  }

  async hasPendingOrganizations(email: string): Promise<boolean> {
    const pendingOrg = await prisma.organizationOnboarding.findFirst({
      where: {
        orgOwnerEmail: email,
        isComplete: false,
      },
    });
    return !!pendingOrg;
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
  }): Promise<boolean> {
    if (!(await this.hasPermissionToCreateForEmail(input.orgOwnerEmail))) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to create an organization for this email",
      });
    }

    if (await this.hasPendingOrganizations(input.orgOwnerEmail)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You already have a pending organization",
      });
    }

    if (this.hasModifiedDefaultPayment(input) && !this.hasPermissionToModifyDefaultPayment()) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to modify the default payment settings",
      });
    }

    if (
      input.teams &&
      !(await this.hasPermissionToMigrateTeams(
        input.teams.filter((team) => team.id > 0 && team.isBeingMigrated).map((team) => team.id)
      ))
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You do not have permission to migrate these teams",
      });
    }

    return true;
  }
}
