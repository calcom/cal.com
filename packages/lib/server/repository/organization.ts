import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { createAProfileForAnExistingUser } from "../../createAProfileForAnExistingUser";
import { UserRepository } from "./user";

const orgSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
};
export class OrganizationRepository {
  static async createWithExistingUserAsOwner({
    orgData,
    owner,
  }: {
    orgData: {
      name: string;
      slug: string;
      isOrganizationConfigured: boolean;
      isOrganizationAdminReviewed: boolean;
      autoAcceptEmail: string;
      seats: number | null;
      pricePerSeat: number | null;
      isPlatform: boolean;
    };
    owner: {
      id: number;
      email: string;
      nonOrgUsername: string;
    };
  }) {
    logger.debug("createWithExistingUserAsOwner", safeStringify({ orgData, owner }));
    const organization = await this.create(orgData);
    const ownerProfile = await createAProfileForAnExistingUser({
      user: {
        id: owner.id,
        email: owner.email,
        currentUsername: owner.nonOrgUsername,
      },
      organizationId: organization.id,
    });

    await prisma.membership.create({
      data: {
        userId: owner.id,
        role: MembershipRole.OWNER,
        accepted: true,
        teamId: organization.id,
      },
    });
    return { organization, ownerProfile };
  }

  static async createWithNonExistentOwner({
    orgData,
    owner,
  }: {
    orgData: {
      name: string;
      slug: string;
      isOrganizationConfigured: boolean;
      isOrganizationAdminReviewed: boolean;
      autoAcceptEmail: string;
      seats: number | null;
      pricePerSeat: number | null;
      isPlatform: boolean;
    };
    owner: {
      email: string;
    };
  }) {
    logger.debug("createWithNonExistentOwner", safeStringify({ orgData, owner }));
    const organization = await this.create(orgData);
    const ownerUsernameInOrg = getOrgUsernameFromEmail(owner.email, orgData.autoAcceptEmail);
    const ownerInDb = await UserRepository.create({
      email: owner.email,
      username: ownerUsernameInOrg,
      organizationId: organization.id,
    });

    await prisma.membership.create({
      data: {
        userId: ownerInDb.id,
        role: MembershipRole.OWNER,
        accepted: true,
        teamId: organization.id,
      },
    });

    return {
      orgOwner: ownerInDb,
      organization,
      ownerProfile: {
        username: ownerUsernameInOrg,
      },
    };
  }

  static async create(orgData: {
    name: string;
    slug: string;
    isOrganizationConfigured: boolean;
    isOrganizationAdminReviewed: boolean;
    autoAcceptEmail: string;
    seats: number | null;
    pricePerSeat: number | null;
    isPlatform: boolean;
  }) {
    return await prisma.team.create({
      data: {
        name: orgData.name,
        isOrganization: true,
        ...(!IS_TEAM_BILLING_ENABLED ? { slug: orgData.slug } : {}),
        organizationSettings: {
          create: {
            isAdminReviewed: orgData.isOrganizationAdminReviewed,
            isOrganizationVerified: true,
            isOrganizationConfigured: orgData.isOrganizationConfigured,
            orgAutoAcceptEmail: orgData.autoAcceptEmail,
          },
        },
        metadata: {
          ...(IS_TEAM_BILLING_ENABLED ? { requestedSlug: orgData.slug } : {}),
          orgSeats: orgData.seats,
          orgPricePerSeat: orgData.pricePerSeat,
          isPlatform: orgData.isPlatform,
        },
        isPlatform: orgData.isPlatform,
      },
    });
  }

  static async findById({ id }: { id: number }) {
    return prisma.team.findUnique({
      where: {
        id,
        isOrganization: true,
      },
      select: orgSelect,
    });
  }

  static async findByIdIncludeOrganizationSettings({ id }: { id: number }) {
    return prisma.team.findUnique({
      where: {
        id,
        isOrganization: true,
      },
      select: {
        ...orgSelect,
        organizationSettings: true,
      },
    });
  }
}
