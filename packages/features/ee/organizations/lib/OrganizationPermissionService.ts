import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { UserPermissionRole } from "@calcom/kysely/types";
import { ORGANIZATION_SELF_SERVE_PRICE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

import type { OnboardingUser } from "./service/onboarding/types";

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
  constructor(private readonly user: OnboardingUser) {}

  async hasPermissionToCreateForEmail(targetEmail: string): Promise<boolean> {
    return this.user.email === targetEmail || this.user.role === "ADMIN";
  }

  /**
   * If an onboarding is complete then it also means that org is created already.
   */
  async hasConflictingOrganization({ slug }: { slug: string }): Promise<boolean> {
    const organizationRepository = getOrganizationRepository();
    return !!(await organizationRepository.findBySlug({ slug }));
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
    return this.user.role === UserPermissionRole.ADMIN;
  }

  hasModifiedDefaultPayment(data: SeatsPrice & { billingPeriod?: string }): boolean {
    const isBillingPeriodModified =
      data.billingPeriod !== undefined && data.billingPeriod !== null && data.billingPeriod !== "MONTHLY";

    const isPricePerSeatModified =
      data.pricePerSeat !== undefined &&
      data.pricePerSeat !== null &&
      data.pricePerSeat !== ORGANIZATION_SELF_SERVE_PRICE;

    log.debug(
      "hasModifiedDefaultPayment",
      safeStringify({ isBillingPeriodModified, isPricePerSeatModified })
    );
    return isBillingPeriodModified || isPricePerSeatModified;
  }

  async hasPermissionToMigrateTeams(teamIds: number[]): Promise<boolean> {
    if (teamIds.length === 0) return true;
    const teamMemberships = await prisma.membership.findMany({
      where: {
        userId: this.user.id,
        teamId: {
          in: teamIds,
        },
        role: {
          in: [MembershipRole.OWNER, MembershipRole.ADMIN],
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
      throw new ErrorWithCode(
        ErrorCode.Unauthorized,
        "you_do_not_have_permission_to_create_an_organization_for_this_email"
      );
    }

    if (await this.hasConflictingOrganization({ slug: input.slug })) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "organization_already_exists_with_this_slug");
    }

    if (await this.hasCompletedOnboarding(input.orgOwnerEmail)) {
      // TODO: Consider redirecting to success page
      throw new ErrorWithCode(ErrorCode.BadRequest, "organization_onboarding_already_completed");
    }

    const teamsToMigrate = input.teams
      ?.filter((team) => team.id > 0 && team.isBeingMigrated)
      .map((team) => team.id);

    if (teamsToMigrate && !(await this.hasPermissionToMigrateTeams(teamsToMigrate))) {
      throw new ErrorWithCode(
        ErrorCode.Unauthorized,
        "you_do_not_have_permission_to_migrate_one_or_more_of_the_teams"
      );
    }

    return true;
  }
}
