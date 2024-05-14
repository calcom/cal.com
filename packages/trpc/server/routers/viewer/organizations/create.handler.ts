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

type SendEmailAndEnrichProfileProps = {
  org: { owner: User; id: number; name: string; ownerEmail: string };
  slug: string;
  userName: string | null;
  nonOrgUsernameForOwner: string | null;
  ownerProfileUsername: string;
  inputLanguageTranslation: TFunction;
  isPlatform: boolean;
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

const sendEmailAndEnrichProfile = async ({
  org: { owner: orgOwner, id, name, ownerEmail },
  slug,
  userName,
  nonOrgUsernameForOwner,
  ownerProfileUsername,
  inputLanguageTranslation,
  isPlatform,
}: SendEmailAndEnrichProfileProps) => {
  !isPlatform &&
    (await sendOrganizationCreationEmail({
      language: inputLanguageTranslation,
      from: userName ?? `${name}'s admin`,
      to: ownerEmail,
      ownerNewUsername: ownerProfileUsername,
      ownerOldUsername: nonOrgUsernameForOwner,
      orgDomain: getOrgFullOrigin(slug, { protocol: false }),
      orgName: name,
      prevLink: `${getOrgFullOrigin("", { protocol: true })}/${nonOrgUsernameForOwner}`,
      newLink: `${getOrgFullOrigin(slug, { protocol: true })}/${ownerProfileUsername}`,
    }));

  const user = await UserRepository.enrichUserWithItsProfile({
    user: { ...orgOwner, organizationId: id },
  });

  return {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    upId: user.profile.upId,
  };
};

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
  orgOwner: User;
  orgData: OrgData;
  orgOwnerEmail: string;
  userName: string | null;
  translation: TFunction;
  loggedInUserId: number;
  availability: Availability;
  existingOwnerDetails: PersistOrgWithExistingOwner;
};

const persistOrganizationWithExistingUserAsOwner = async ({
  orgData,
  orgOwner,
  orgOwnerEmail,
  userName,
  availability,
  translation,
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

  const user = await sendEmailAndEnrichProfile({
    org: { owner: orgOwner, id: organization.id, name: organization.name, ownerEmail: orgOwnerEmail },
    slug: orgData.slug,
    userName: userName,
    ownerProfileUsername: ownerProfile.username,
    inputLanguageTranslation: translation,
    nonOrgUsernameForOwner: nonOrgUsernameForOwner,
    isPlatform: orgData.isPlatform,
  });

  await prisma.availability.createMany({
    data: availability.map((schedule) => ({
      days: schedule.days,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      userId: user.userId,
    })),
  });

  return user;
};

type PersistOrganizationWithNonExistentOwnerProps = {
  orgData: OrgData;
  orgOwner: User | null;
  orgOwnerEmail: string;
  userLocale: string;
  userName: string | null;
  translation: TFunction;
};

const persistOrganizationWithNonExistentOwner = async ({
  orgData,
  orgOwner,
  orgOwnerEmail,
  userLocale,
  userName,
  translation,
}: PersistOrganizationWithNonExistentOwnerProps) => {
  let organizationOwner = orgOwner;
  const data = await OrganizationRepository.createWithNonExistentOwner({
    orgData,
    owner: {
      email: orgOwnerEmail,
    },
  });

  organizationOwner = data.orgOwner;

  const { organization, ownerProfile } = data;

  !orgData.isPlatform &&
    (await sendEmailVerification({
      email: orgOwnerEmail,
      language: userLocale,
      username: ownerProfile.username || "",
    }));

  const user = await sendEmailAndEnrichProfile({
    org: {
      owner: organizationOwner,
      id: organization.id,
      name: organization.name,
      ownerEmail: orgOwnerEmail,
    },
    slug: orgData.slug,
    userName: userName,
    ownerProfileUsername: ownerProfile.username,
    nonOrgUsernameForOwner: null,
    inputLanguageTranslation: translation,
    isPlatform: orgData.isPlatform,
  });

  return user;
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

  const orgOwner = await prisma.user.findUnique({
    where: {
      email: orgOwnerEmail,
    },
  });

  return !orgOwner
    ? persistOrganizationWithNonExistentOwner({
        orgData: orgData,
        orgOwner: orgOwner,
        orgOwnerEmail: orgOwnerEmail,
        userLocale: userLocale,
        userName: userName,
        translation: inputLanguageTranslation,
      })
    : persistOrganizationWithExistingUserAsOwner({
        orgData: orgData,
        orgOwner: orgOwner,
        orgOwnerEmail: orgOwnerEmail,
        userName: userName,
        existingOwnerDetails: {
          ownerId: orgOwner.id,
          orgId: orgId,
          ownerUsername: orgOwner.username,
        },
        translation: inputLanguageTranslation,
        loggedInUserId: loggedInUser.id,
        availability: availability,
      });
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
  inputLanguageTranslation,
  isPlatform,
  ctx: { userLocale, userName, orgId },
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

  const orgOwner = await prisma.user.findUnique({
    where: {
      email: orgOwnerEmail,
    },
  });

  return !orgOwner
    ? persistOrganizationWithNonExistentOwner({
        orgData: orgData,
        orgOwner: orgOwner,
        orgOwnerEmail: orgOwnerEmail,
        userLocale: userLocale,
        userName: userName,
        translation: inputLanguageTranslation,
      })
    : persistOrganizationWithExistingUserAsOwner({
        orgData: orgData,
        orgOwner: orgOwner,
        orgOwnerEmail: orgOwnerEmail,
        userName: userName,
        existingOwnerDetails: {
          ownerId: orgOwner.id,
          orgId: orgId,
          ownerUsername: orgOwner.username,
        },
        translation: inputLanguageTranslation,
        loggedInUserId: loggedInUser.id,
        availability: availability,
      });
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, orgOwnerEmail, seats, pricePerSeat, isPlatform } = input;

  const inputLanguageTranslation = await getTranslation(input.language ?? "en", "common");
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
  const autoAcceptEmail = orgOwnerEmail.split("@")[1];

  const user = isPlatform
    ? await createPlatformUser({
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
      })
    : await createOrgUser({
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
      });

  return user;

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);
};

export default createHandler;
