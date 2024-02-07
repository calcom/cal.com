import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
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
      autoAcceptEmail: boolean;
    };
    owner: {
      id: number;
      email: string;
      username: string;
    };
  }) {
    const organization = await prisma.team.create({
      data: {
        name: orgData.name,
        ...(!IS_TEAM_BILLING_ENABLED ? { slug: orgData.slug } : {}),
        metadata: {
          ...(IS_TEAM_BILLING_ENABLED ? { requestedSlug: orgData.slug } : {}),
          isOrganization: true,
          isOrganizationVerified: true,
          isOrganizationConfigured: orgData.isOrganizationConfigured,
          orgAutoAcceptEmail: orgData.autoAcceptEmail,
        },
      },
    });

    await createAProfileForAnExistingUser({
      user: {
        id: owner.id,
        email: owner.email,
        currentUsername: owner.username,
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
  }
}
