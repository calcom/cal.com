import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { createAProfileForAnExistingUser } from "../../createAProfileForAnExistingUser";

export class OrganizationRepository {
  static async createWithOwner({
    orgData,
    owner,
  }: {
    orgData: {
      name: string;
      slug: string;
      isOrganizationConfigured: boolean;
      autoAcceptEmail: string;
      seats: number | null;
      pricePerSeat: number | null;
    };
    owner: {
      id: number;
      email: string;
      nonOrgUsername: string;
    };
  }) {
    logger.debug("Creating organization with owner", safeStringify({ orgData, owner }));
    const organization = await prisma.team.create({
      data: {
        name: orgData.name,
        isOrganization: true,
        ...(!IS_TEAM_BILLING_ENABLED ? { slug: orgData.slug } : {}),
        organizationSettings: {
          create: {
            isOrganizationVerified: true,
            isOrganizationConfigured: orgData.isOrganizationConfigured,
            orgAutoAcceptEmail: orgData.autoAcceptEmail,
          },
        },
        metadata: {
          ...(IS_TEAM_BILLING_ENABLED ? { requestedSlug: orgData.slug } : {}),
          orgSeats: orgData.seats,
          orgPricePerSeat: orgData.pricePerSeat,
        },
      },
    });

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
}
