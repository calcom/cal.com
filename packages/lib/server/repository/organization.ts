import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { CreationSource } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { z } from "zod";
import { createAProfileForAnExistingUser } from "../../createAProfileForAnExistingUser";
import { getParsedTeam } from "./teamUtils";
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
      slug: string | null;
      isOrganizationConfigured: boolean;
      isOrganizationAdminReviewed: boolean;
      autoAcceptEmail: string;
      seats: number | null;
      pricePerSeat: number | null;
      isPlatform: boolean;
      billingPeriod?: "MONTHLY" | "ANNUALLY";
      logoUrl: string | null;
      bio: string | null;
      // Required for Organization and not for platform
      paymentSubscriptionId: string | null;
    };
    owner: {
      id: number;
      email: string;
      nonOrgUsername: string;
    };
  }) {
    logger.debug("createWithExistingUserAsOwner", safeStringify({ orgData, owner }));
    if (!orgData.isPlatform && !orgData.paymentSubscriptionId) {
      throw new Error("paymentSubscriptionId is required for non-platform organizations");
    }
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
    creationSource,
  }: {
    orgData: {
      name: string;
      slug: string;
      isOrganizationConfigured: boolean;
      isOrganizationAdminReviewed: boolean;
      autoAcceptEmail: string;
      seats: number | null;
      billingPeriod?: "MONTHLY" | "ANNUALLY";
      pricePerSeat: number | null;
      isPlatform: boolean;
      logoUrl: string | null;
      bio: string | null;
      paymentSubscriptionId: string | null;
    };
    owner: {
      email: string;
    };
    creationSource: CreationSource;
  }) {
    logger.debug("createWithNonExistentOwner", safeStringify({ orgData, owner }));
    if (!orgData.isPlatform && !orgData.paymentSubscriptionId) {
      throw new Error("paymentSubscriptionId is required for non-platform organizations");
    }
    const organization = await this.create(orgData);
    const ownerUsernameInOrg = getOrgUsernameFromEmail(owner.email, orgData.autoAcceptEmail);
    const ownerInDb = await UserRepository.create({
      email: owner.email,
      username: ownerUsernameInOrg,
      organizationId: organization.id,
      creationSource,
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
    slug: string | null;
    isOrganizationConfigured: boolean;
    isOrganizationAdminReviewed: boolean;
    autoAcceptEmail: string;
    seats: number | null;
    billingPeriod?: "MONTHLY" | "ANNUALLY";
    pricePerSeat: number | null;
    isPlatform: boolean;
    logoUrl: string | null;
    bio: string | null;
    paymentSubscriptionId: string | null;
  }) {
    return await prisma.team.create({
      data: {
        name: orgData.name,
        isOrganization: true,
        slug: orgData.slug,
        // This is huge and causes issues, we need to have the logic to convert logo to logoUrl and then use that url ehre.
        // logoUrl: orgData.logoUrl,
        bio: orgData.bio,
        organizationSettings: {
          create: {
            isAdminReviewed: orgData.isOrganizationAdminReviewed,
            isOrganizationVerified: true,
            isOrganizationConfigured: orgData.isOrganizationConfigured,
            orgAutoAcceptEmail: orgData.autoAcceptEmail,
          },
        },
        metadata: {
          isPlatform: orgData.isPlatform,
          orgSeats: orgData.seats,
          orgPricePerSeat: orgData.pricePerSeat,
          billingPeriod: orgData.billingPeriod,
          // We set it here as required by various places in app. We could plan to move it to OrganizationOnboarding later
          subscriptionId: orgData.paymentSubscriptionId,
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
    });
  }

  static async findBySlug({ slug }: { slug: string }) {
    // Slug is unique but could be null as well, so we can't use findUnique
    return prisma.team.findFirst({
      where: {
        slug,
        isOrganization: true,
      },
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

  static async findUniqueNonPlatformOrgsByMatchingAutoAcceptEmail({ email }: { email: string }) {
    const emailDomain = email.split("@").at(-1);
    const orgs = await prisma.team.findMany({
      where: {
        isOrganization: true,
        isPlatform: false,
        organizationSettings: {
          orgAutoAcceptEmail: emailDomain,
          isOrganizationVerified: true,
          isAdminReviewed: true,
        },
      },
    });
    if (orgs.length > 1) {
      logger.error(
        "Multiple organizations found with the same auto accept email domain",
        safeStringify({ orgs, emailDomain })
      );
      // Detect and fail just in case this situation arises. We should really identify the problem in this case and fix the data.
      throw new Error("Multiple organizations found with the same auto accept email domain");
    }
    const org = orgs[0];
    if (!org) {
      return null;
    }
    return getParsedTeam(org);
  }

  static async findCurrentOrg({ userId, orgId }: { userId: number; orgId: number }) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        team: {
          id: orgId,
        },
      },
      include: {
        team: true,
      },
    });

    const organizationSettings = await prisma.organizationSettings.findUnique({
      where: {
        organizationId: orgId,
      },
      select: {
        lockEventTypeCreationForUsers: true,
        adminGetsNoSlotsNotification: true,
        isAdminReviewed: true,
        allowSEOIndexing: true,
        orgProfileRedirectsToVerifiedDomain: true,
        orgAutoAcceptEmail: true,
      },
    });

    if (!membership) {
      throw new Error("You do not have a membership to your organization");
    }

    const metadata = teamMetadataSchema.parse(membership?.team.metadata);

    return {
      canAdminImpersonate: !!organizationSettings?.isAdminReviewed,
      organizationSettings: {
        lockEventTypeCreationForUsers: organizationSettings?.lockEventTypeCreationForUsers,
        adminGetsNoSlotsNotification: organizationSettings?.adminGetsNoSlotsNotification,
        allowSEOIndexing: organizationSettings?.allowSEOIndexing,
        orgProfileRedirectsToVerifiedDomain: organizationSettings?.orgProfileRedirectsToVerifiedDomain,
        orgAutoAcceptEmail: organizationSettings?.orgAutoAcceptEmail,
      },
      user: {
        role: membership?.role,
        accepted: membership?.accepted,
      },
      ...membership?.team,
      metadata,
    };
  }

  static async findTeamsInOrgIamNotPartOf({ userId, parentId }: { userId: number; parentId: number | null }) {
    const teamsInOrgIamNotPartOf = await prisma.team.findMany({
      where: {
        parentId,
        members: {
          none: {
            userId,
          },
        },
      },
    });

    return teamsInOrgIamNotPartOf;
  }

  static async adminFindById({ id }: { id: number }) {
    const org = await prisma.team.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        metadata: true,
        isOrganization: true,
        members: {
          where: {
            role: "OWNER",
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        organizationSettings: {
          select: {
            isOrganizationConfigured: true,
            isOrganizationVerified: true,
            orgAutoAcceptEmail: true,
          },
        },
      },
    });
    if (!org) {
      throw new Error("Organization not found");
    }

    const parsedMetadata = teamMetadataSchema.parse(org.metadata);
    if (!org?.isOrganization) {
      throw new Error("Organization not found");
    }
    return { ...org, metadata: parsedMetadata };
  }

  static async findByMemberEmail({ email }: { email: string }) {
    const organization = await prisma.team.findFirst({
      where: {
        isOrganization: true,
        members: {
          some: {
            user: { email },
          },
        },
      },
    });
    return organization ?? null;
  }

  static async findByMemberEmailId({ email }: { email: string }) {
    const log = logger.getSubLogger({ prefix: ["findByMemberEmailId"] });
    log.debug("called with", { email });
    const organization = await prisma.team.findFirst({
      where: {
        isOrganization: true,
        members: {
          some: {
            user: {
              email,
            },
          },
        },
      },
    });

    return organization;
  }

  static async findCalVideoLogoByOrgId({ id }: { id: number }) {
    const org = await prisma.team.findUnique({
      where: {
        id,
      },
      select: {
        calVideoLogo: true,
      },
    });

    return org?.calVideoLogo;
  }

  static async getVerifiedOrganizationByAutoAcceptEmailDomain(domain: string) {
    return await prisma.team.findFirst({
      where: {
        organizationSettings: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: domain,
        },
      },
      select: {
        id: true,
        organizationSettings: {
          select: {
            orgAutoAcceptEmail: true,
          },
        },
      },
    });
  }

  static async setSlug({ id, slug }: { id: number; slug: string }) {
    return await prisma.team.update({
      where: { id, isOrganization: true },
      data: { slug },
    });
  }

  static async updateStripeSubscriptionDetails({ id, stripeSubscriptionId, stripeSubscriptionItemId, existingMetadata }: { id: number; stripeSubscriptionId: string; stripeSubscriptionItemId: string; existingMetadata: z.infer<typeof teamMetadataSchema> }) {
    return await prisma.team.update({
      where: { id, isOrganization: true },
      data: {
        metadata: {
          ...existingMetadata,
          subscriptionId: stripeSubscriptionId,
          subscriptionItemId: stripeSubscriptionItemId,
        }
      },
    });
  }
}
