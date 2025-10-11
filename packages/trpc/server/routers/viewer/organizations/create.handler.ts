import { lookup } from "dns";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { sendAdminOrganizationNotification, sendOrganizationCreationEmail } from "@calcom/emails";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import {
  RESERVED_SUBDOMAINS,
  ORG_SELF_SERVE_ENABLED,
  ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE,
  WEBAPP_URL,
} from "@calcom/lib/constants";
import { createDomain } from "@calcom/lib/domainManager/organization";
import { getTranslation } from "@calcom/lib/server/i18n";
import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import { BillingPeriod } from "./create.schema";
import type { TCreateInputSchema } from "./create.schema";

/**
 * We can only say for sure that the email is not a company email. We can't say for sure if it is a company email.
 */
function isNotACompanyEmail(email: string) {
  // A list of popular @domains that can't be used to allow automatic acceptance of memberships to organization
  const emailProviders = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "aol.com",
    "icloud.com",
    "mail.com",
    "protonmail.com",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "fastmail.com",
    "inbox.com",
    "me.com",
    "hushmail.com",
    "live.com",
    "rediffmail.com",
    "tutanota.com",
    "mail.ru",
    "usa.com",
    "qq.com",
    "163.com",
    "web.de",
    "rocketmail.com",
    "excite.com",
    "lycos.com",
    "outlook.co",
    "hotmail.co.uk",
  ];

  const emailParts = email.split("@");
  if (emailParts.length < 2) return true;
  return emailProviders.includes(emailParts[1]);
}

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

const getIPAddress = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    lookup(url, (err, address) => {
      if (err) reject(err);
      resolve(address);
    });
  });
};

/**
 * TODO: To be removed. We need to reuse the logic from orgCreationUtils like in intentToCreateOrgHandler
 */
export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const {
    slug,
    name,
    orgOwnerEmail,
    seats,
    pricePerSeat,
    isPlatform,
    billingPeriod: billingPeriodRaw,
    creationSource,
  } = input;

  const loggedInUser = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      id: true,
      role: true,
      email: true,
      completedOnboarding: true,
      emailVerified: true,
      teams: {
        select: {
          team: {
            select: {
              slug: true,
              isOrganization: true,
              isPlatform: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!loggedInUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not authorized." });

  const IS_USER_ADMIN = loggedInUser.role === UserPermissionRole.ADMIN;

  // We only allow creating an annual billing period if you are a system admin
  const billingPeriod = (IS_USER_ADMIN ? billingPeriodRaw : BillingPeriod.MONTHLY) ?? BillingPeriod.MONTHLY;

  if (!ORG_SELF_SERVE_ENABLED && !IS_USER_ADMIN && !isPlatform) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create organizations" });
  }

  if (!IS_USER_ADMIN && loggedInUser.email !== orgOwnerEmail && !isPlatform) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only create organization where you are the owner",
    });
  }

  if (isNotACompanyEmail(orgOwnerEmail) && !isPlatform) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Use company email to create an organization" });
  }

  const publishedTeams = loggedInUser.teams.filter((team) => !!team.team.slug);

  if (!IS_USER_ADMIN && publishedTeams.length < ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE && !isPlatform) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You need to have minimum published teams." });
  }

  let orgOwner = await prisma.user.findUnique({
    where: {
      email: orgOwnerEmail,
    },
  });

  const hasAnOrgWithSameSlug = await prisma.team.findFirst({
    where: {
      slug: slug,
      parentId: null,
      isOrganization: true,
    },
  });

  // Allow creating an organization with same requestedSlug as a non-org Team's slug
  // It is needed so that later we can migrate the non-org Team(with the conflicting slug) to the newly created org
  // Publishing the organization would fail if the team with the same slug is not migrated first

  if (hasAnOrgWithSameSlug || RESERVED_SUBDOMAINS.includes(slug))
    throw new TRPCError({ code: "BAD_REQUEST", message: "organization_url_taken" });

  const hasExistingPlatformOrOrgTeam = loggedInUser?.teams.find((team) => {
    return team.team.isPlatform || team.team.isOrganization;
  });

  if (!!hasExistingPlatformOrOrgTeam?.team && isPlatform) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `You can't create a new team because you are already a part of ${hasExistingPlatformOrOrgTeam.team.name}`,
    });
  }

  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

  const isOrganizationConfigured = isPlatform ? true : await createDomain(slug);
  const loggedInUserTranslation = await getTranslation(ctx.user.locale, "common");
  const inputLanguageTranslation = await getTranslation(input.language ?? "en", "common");

  if (!isOrganizationConfigured) {
    // Otherwise, we proceed to send an administrative email to admins regarding
    // the need to configure DNS registry to support the newly created org
    const instanceAdmins = await prisma.user.findMany({
      where: { role: UserPermissionRole.ADMIN },
      select: { email: true },
    });
    if (instanceAdmins.length) {
      await sendAdminOrganizationNotification({
        instanceAdmins,
        orgSlug: slug,
        ownerEmail: orgOwnerEmail,
        webappIPAddress: await getIPAddress(
          WEBAPP_URL.replace("https://", "")?.replace("http://", "").replace(/(:.*)/, "")
        ),
        t: loggedInUserTranslation,
      });
    } else {
      console.warn("Organization created: subdomain not configured and couldn't notify adminnistrators");
    }
  }

  const autoAcceptEmail = isPlatform ? "UNUSED_FOR_PLATFORM" : orgOwnerEmail.split("@")[1];

  const orgData = {
    name,
    slug,
    isOrganizationConfigured,
    isOrganizationAdminReviewed: IS_USER_ADMIN,
    autoAcceptEmail,
    seats: seats ?? null,
    pricePerSeat: pricePerSeat ?? null,
    isPlatform,
    billingPeriod,
    logoUrl: null,
    bio: null,
    paymentSubscriptionId: null,
  };

  // Create a new user and invite them as the owner of the organization
  if (!orgOwner) {
    const data = await OrganizationRepository.createWithNonExistentOwner({
      orgData,
      owner: {
        email: orgOwnerEmail,
      },
      creationSource,
    });

    orgOwner = data.orgOwner;

    const { organization, ownerProfile } = data;

    const translation = await getTranslation(input.language ?? "en", "common");

    await sendEmailVerification({
      email: orgOwnerEmail,
      language: ctx.user.locale,
      username: ownerProfile.username || "",
      isPlatform: isPlatform,
    });

    if (!isPlatform) {
      await sendOrganizationCreationEmail({
        language: translation,
        from: ctx.user.name ?? `${organization.name}'s admin`,
        to: orgOwnerEmail,
        ownerNewUsername: ownerProfile.username,
        ownerOldUsername: null,
        orgDomain: getOrgFullOrigin(slug, { protocol: false }),
        orgName: organization.name,
        prevLink: null,
        newLink: `${getOrgFullOrigin(slug, { protocol: true })}/${ownerProfile.username}`,
      });
    }

    const user = await new UserRepository(prisma).enrichUserWithItsProfile({
      user: { ...orgOwner, organizationId: organization.id },
    });

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      upId: user.profile.upId,
    };
  } else {
    // If we are making the loggedIn user the owner of the organization and he is already a part of an organization, we don't allow it because multi-org is not supported yet
    const isLoggedInUserOrgOwner = orgOwner.id === loggedInUser.id;
    if (ctx.user.profile.organizationId && isLoggedInUserOrgOwner) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You are part of an organization already" });
    }

    if (!orgOwner.emailVerified) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You need to verify your email first" });
    }

    const nonOrgUsernameForOwner = orgOwner.username || "";
    const { organization, ownerProfile } = await OrganizationRepository.createWithExistingUserAsOwner({
      orgData,
      owner: {
        id: orgOwner.id,
        email: orgOwnerEmail,
        nonOrgUsername: nonOrgUsernameForOwner,
      },
    });

    if (!isPlatform) {
      await sendOrganizationCreationEmail({
        language: inputLanguageTranslation,
        from: ctx.user.name ?? `${organization.name}'s admin`,
        to: orgOwnerEmail,
        ownerNewUsername: ownerProfile.username,
        ownerOldUsername: nonOrgUsernameForOwner,
        orgDomain: getOrgFullOrigin(slug, { protocol: false }),
        orgName: organization.name,
        prevLink: `${getOrgFullOrigin("", { protocol: true })}/${nonOrgUsernameForOwner}`,
        newLink: `${getOrgFullOrigin(slug, { protocol: true })}/${ownerProfile.username}`,
      });
    }

    if (!organization.id) throw Error("User not created");
    const user = await new UserRepository(prisma).enrichUserWithItsProfile({
      user: { ...orgOwner, organizationId: organization.id },
    });

    await prisma.availability.createMany({
      data: availability.map((schedule) => ({
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        userId: user.id,
      })),
    });

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      upId: user.profile.upId,
    };
  }
};

export default createHandler;
