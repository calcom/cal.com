import type { User, Team } from "@prisma/client";
import { lookup } from "dns";
import type { TFunction } from "next-i18next";

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
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

type LoggedInUserType = {
  id: User["id"];
  role: User["role"];
  teams: {
    team: { slug: Team["slug"] };
  }[];
};

type checkOrgOwnerCreationRequirementsProps = {
  user: { role: LoggedInUserType["role"]; email: string };
  org: { email: string; slug: string };
  teams: LoggedInUserType["teams"];
};

const getIPAddress = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    lookup(url, (err, address) => {
      if (err) reject(err);
      resolve(address);
    });
  });
};

const checkLoginStatus = async (userId: number) => {
  const loggedInUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      email: true,
      teams: {
        select: {
          team: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });
  if (!loggedInUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not authorized." });

  return loggedInUser;
};

const checkUserIsAdminOrThrow = (
  userRole: LoggedInUserType["role"],
  loggedInUserEmail: string,
  orgOwnerEmail: string
) => {
  const IS_USER_ADMIN = userRole === UserPermissionRole.ADMIN;
  if (!ORG_SELF_SERVE_ENABLED && !IS_USER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create organizations" });
  }

  if (!IS_USER_ADMIN && loggedInUserEmail !== orgOwnerEmail) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only create organization where you are the owner",
    });
  }

  return IS_USER_ADMIN;
};

const checkOrgPublishedTeams = (teams: LoggedInUserType["teams"], isAdmin: boolean) => {
  if (isAdmin) return;

  const publishedTeams = teams.filter((team) => !!team.team.slug);

  if (publishedTeams.length < ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You need to have atleast two published teams." });
  }
};

const isOrgSlugTaken = async (orgSlug: string) => {
  const hasAnOrgWithSameSlug = await prisma.team.findFirst({
    where: {
      slug: orgSlug,
      parentId: null,
      isOrganization: true,
    },
  });

  // Allow creating an organization with same requestedSlug as a non-org Team's slug
  // It is needed so that later we can migrate the non-org Team(with the conflicting slug) to the newly created org
  // Publishing the organization would fail if the team with the same slug is not migrated first

  if (hasAnOrgWithSameSlug || RESERVED_SUBDOMAINS.includes(orgSlug))
    throw new TRPCError({ code: "BAD_REQUEST", message: "organization_url_taken" });
};

const createOrgDomainAndNotifyAdmins = async (
  isOrganizationConfigured: boolean,
  orgOwnerEmail: string,
  slug: NonNullable<Team["slug"]>,
  locale: string
) => {
  const loggedInUserTranslation = await getTranslation(locale, "common");

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

      return;
    }

    console.warn("Organization created: subdomain not configured and couldn't notify adminnistrators");
  }
};

const checkOrgOwnerCreationRequirements = async ({
  user: { email, role },
  org: { email: orgOwnerEmail, slug: orgSlug },
  teams,
}: checkOrgOwnerCreationRequirementsProps) => {
  const IS_USER_ADMIN = checkUserIsAdminOrThrow(role, email, orgOwnerEmail);

  checkOrgPublishedTeams(teams, IS_USER_ADMIN);

  await isOrgSlugTaken(orgSlug);

  return IS_USER_ADMIN;
};

type Availability = {
  id: number;
  userId: number | null;
  eventTypeId: number | null;
  days: number[];
  startTime: Date;
  endTime: Date;
  date: Date | null;
  scheduleId: number | null;
}[];

type OrgData = {
  name: string;
  slug: string;
  isOrganizationConfigured: boolean;
  isOrganizationAdminReviewed: boolean;
  autoAcceptEmail: string;
  seats: number | null;
  pricePerSeat: number | null;
  isPlatform: boolean;
};

type PersistOrgWithExistingOwner = {
  ownerId: User["id"];
  ownerUsername: User["username"];
  orgId: number | null;
};

type PersistOrganizationWithExistingUserAsOwnerProps = {
  orgData: OrgData;
  orgOwnerEmail: string;
  loggedInUserId: number;
  existingOwnerDetails: PersistOrgWithExistingOwner;
};

const persistOrganizationWithExistingUserAsOwner = async ({
  orgData,
  orgOwnerEmail,
  loggedInUserId,
  existingOwnerDetails: { orgId, ownerId: orgOwnerId, ownerUsername },
}: PersistOrganizationWithExistingUserAsOwnerProps) => {
  const isLoggedInUserOrgOwner = orgOwnerId === loggedInUserId;
  if (orgId && isLoggedInUserOrgOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User is part of an organization already" });
  }

  const nonOrgUsernameForOwner = ownerUsername || "";
  const { organization, ownerProfile } = await OrganizationRepository.createWithExistingUserAsOwner({
    orgData,
    owner: {
      id: orgOwnerId,
      email: orgOwnerEmail,
      nonOrgUsername: nonOrgUsernameForOwner,
    },
  });

  if (!organization.id) throw Error("User not created");

  return { organization, ownerProfile };
};

type PersistOrganizationWithNonExistentOwnerProps = {
  orgData: OrgData;
  orgOwnerEmail: string;
};

const persistOrganizationWithNonExistentOwner = async ({
  orgData,
  orgOwnerEmail,
}: PersistOrganizationWithNonExistentOwnerProps) => {
  const { organization, ownerProfile, orgOwner } = await OrganizationRepository.createWithNonExistentOwner({
    orgData,
    owner: {
      email: orgOwnerEmail,
    },
  });

  return { organization, ownerProfile, orgOwner };
};

type CreateUserProps = {
  userId: number;
  name: string;
  slug: string;
  orgOwnerEmail: string;
  autoAcceptEmail: string;
  seats?: number;
  pricePerSeat?: number;
  inputLanguageTranslation: TFunction;
  availability: Availability;
  isPlatform: boolean;
  ctx: { userLocale: string; userName: string | null; orgId: number | null };
};

const createOrgUser = async ({
  userId,
  name,
  slug,
  orgOwnerEmail,
  isPlatform,
  autoAcceptEmail,
  seats,
  pricePerSeat,
  inputLanguageTranslation,
  availability,
  ctx: { userLocale, userName, orgId },
}: CreateUserProps) => {
  const loggedInUser = await checkLoginStatus(userId);

  const isOrganizationConfigured = await createDomain(slug);

  const IS_USER_ADMIN = await checkOrgOwnerCreationRequirements({
    user: { email: loggedInUser.email, role: loggedInUser.role },
    org: { email: orgOwnerEmail, slug: slug },
    teams: loggedInUser.teams,
  });

  await createOrgDomainAndNotifyAdmins(isOrganizationConfigured, orgOwnerEmail, slug, userLocale);

  const orgData = {
    name,
    slug,
    isOrganizationConfigured,
    isOrganizationAdminReviewed: IS_USER_ADMIN,
    autoAcceptEmail,
    seats: seats ?? null,
    pricePerSeat: pricePerSeat ?? null,
    isPlatform,
  };

  const existingOrgOwner = await prisma.user.findUnique({
    where: {
      email: orgOwnerEmail,
    },
  });
  let createdOrg;
  let newOwnerProfile;
  let createdOrgOwner;
  if (existingOrgOwner) {
    const { organization, ownerProfile } = await persistOrganizationWithExistingUserAsOwner({
      orgData: orgData,
      orgOwnerEmail: orgOwnerEmail,
      existingOwnerDetails: {
        ownerId: existingOrgOwner.id,
        orgId: orgId,
        ownerUsername: existingOrgOwner.username,
      },
      loggedInUserId: loggedInUser.id,
    });
    createdOrg = organization;
    newOwnerProfile = ownerProfile;
    createdOrgOwner = existingOrgOwner;
    await prisma.availability.createMany({
      data: availability.map((schedule) => ({
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        userId: user.id,
      })),
    });
  } else {
    const {
      organization,
      ownerProfile,
      orgOwner: newOrgOwner,
    } = await persistOrganizationWithNonExistentOwner({
      orgData: orgData,
      orgOwnerEmail: orgOwnerEmail,
    });
    createdOrgOwner = newOrgOwner;
    createdOrg = organization;
    newOwnerProfile = ownerProfile;

    await sendEmailVerification({
      email: orgOwnerEmail,
      language: userLocale,
      username: ownerProfile.username || "",
    });
  }

  await sendOrganizationCreationEmail({
    language: inputLanguageTranslation,
    from: userName ?? `${createdOrg.name}'s admin`,
    to: orgOwnerEmail,
    ownerNewUsername: newOwnerProfile.username,
    ownerOldUsername: null,
    orgDomain: getOrgFullOrigin(orgData.slug, { protocol: false }),
    orgName: createdOrg.name,
    prevLink: existingOrgOwner
      ? `${getOrgFullOrigin("", { protocol: true })}/${existingOrgOwner.username || ""}`
      : null,
    newLink: `${getOrgFullOrigin(orgData.slug, { protocol: true })}/${newOwnerProfile.username}`,
  });

  const user = await UserRepository.enrichUserWithItsProfile({
    user: { ...createdOrgOwner, organizationId: createdOrg.id },
  });

  return {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    upId: user.profile.upId,
  };
};

const createPlatformUser = async ({
  userId,
  name,
  slug,
  orgOwnerEmail,
  autoAcceptEmail,
  seats,
  pricePerSeat,
  availability,
  isPlatform,
  ctx: { orgId },
}: CreateUserProps) => {
  const loggedInUser = await checkLoginStatus(userId);
  const isOrganizationConfigured = true;
  const isOrganizationAdminReviewed = true;

  await isOrgSlugTaken(slug);

  const orgData = {
    name,
    slug,
    isOrganizationConfigured,
    isOrganizationAdminReviewed: isOrganizationAdminReviewed,
    autoAcceptEmail,
    seats: seats ?? null,
    pricePerSeat: pricePerSeat ?? null,
    isPlatform,
  };

  let orgOwner = await prisma.user.findUnique({
    where: {
      email: orgOwnerEmail,
    },
  });
  let createdOrg;
  if (orgOwner) {
    const { organization } = await persistOrganizationWithExistingUserAsOwner({
      orgData: orgData,
      orgOwnerEmail: orgOwnerEmail,
      existingOwnerDetails: {
        ownerId: orgOwner.id,
        orgId: orgId,
        ownerUsername: orgOwner.username,
      },
      loggedInUserId: loggedInUser.id,
    });
    createdOrg = organization;

    await prisma.availability.createMany({
      data: availability.map((schedule) => ({
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        userId: user.id,
      })),
    });
  } else {
    const { organization, orgOwner: newOrgOwner } = await persistOrganizationWithNonExistentOwner({
      orgData: orgData,
      orgOwnerEmail: orgOwnerEmail,
    });
    orgOwner = newOrgOwner;
    createdOrg = organization;
  }

  const user = await UserRepository.enrichUserWithItsProfile({
    user: { ...orgOwner, organizationId: createdOrg.id },
  });

  return {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    upId: user.profile.upId,
  };
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, orgOwnerEmail, seats, pricePerSeat, isPlatform } = input;

  const inputLanguageTranslation = await getTranslation(input.language ?? "en", "common");
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
  const autoAcceptEmail = orgOwnerEmail.split("@")[1];

  const createUserParams = {
    userId: ctx.user.id,
    name: name,
    slug: slug,
    orgOwnerEmail: orgOwnerEmail,
    seats: seats,
    pricePerSeat: pricePerSeat,
    isPlatform: isPlatform,
    inputLanguageTranslation: inputLanguageTranslation,
    availability: availability,
    autoAcceptEmail: autoAcceptEmail,
    ctx: { userLocale: ctx.user.locale, userName: ctx.user.name, orgId: ctx.user.profile.organizationId },
  };

  const user = isPlatform
    ? await createPlatformUser(createUserParams)
    : await createOrgUser(createUserParams);

  return user;

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);
};

export default createHandler;
