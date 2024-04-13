import { createHash } from "crypto";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "../../availability";
import { createAProfileForAnExistingUser } from "../../createAProfileForAnExistingUser";
import slugify from "../../slugify";
import { ProfileRepository } from "./profile";

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
    logger.debug("Creating organization with owner", safeStringify({ orgData, owner }));
    const organization = await prisma.team.create({
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

  static async createOrganizationAndOwner({
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
    logger.debug("Creating organization with owner", safeStringify({ orgData, owner }));
    const password = createHash("md5")
      .update(`${owner.email}${process.env.CALENDSO_ENCRYPTION_KEY}`)
      .digest("hex");

    const t = await getTranslation("en", "common");
    const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
    const hashedPassword = await hashPassword(password);
    const ownerUsername = getOrgUsernameFromEmail(owner.email, orgData.autoAcceptEmail);
    const organization = await prisma.team.create({
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
      },
    });

    const ownerInDb = await prisma.user.create({
      data: {
        username: slugify(ownerUsername),
        email: owner.email,
        emailVerified: new Date(),
        password: { create: { hash: hashedPassword } },
        // Default schedule
        schedules: {
          create: {
            name: t("default_schedule_name"),
            availability: {
              createMany: {
                data: availability.map((schedule) => ({
                  days: schedule.days,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                })),
              },
            },
          },
        },
        organizationId: organization.id,
        profiles: {
          create: {
            username: slugify(ownerUsername),
            organizationId: organization.id,
            uid: ProfileRepository.generateProfileUid(),
          },
        },
      },
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
        username: ownerUsername,
      },
    };
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
