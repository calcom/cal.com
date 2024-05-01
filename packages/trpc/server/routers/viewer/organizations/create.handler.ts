import type { User, Team, Profile } from "@prisma/client";
import { lookup } from "dns";
import type { TFunction } from "next-i18next";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { sendAdminOrganizationNotification, sendOrganizationCreationEmail } from "@calcom/emails";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import {
  RESERVED_SUBDOMAINS,
  WEBAPP_URL,
  ORG_SELF_SERVE_ENABLED,
  ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE,
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

const getIPAddress = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    lookup(url, (err, address) => {
      if (err) reject(err);
      resolve(address);
    });
  });
};

type LoggedInUserType = {
  id: User["id"];
  role: User["role"];
  teams: {
    team: { slug: Team["slug"] };
  }[];
};

const checkUserIsAdmin = (userRole: LoggedInUserType["role"]) => {
  const IS_USER_ADMIN = userRole === UserPermissionRole.ADMIN;
  if (!ORG_SELF_SERVE_ENABLED && !IS_USER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create organizations" });
  }
  return IS_USER_ADMIN;
};

const checkOrgPublishedTeams = (teams: LoggedInUserType["teams"], isAdmin: boolean) => {
  const publishedTeams = teams.filter((team) => !!team.team.slug);
  if (!isAdmin && publishedTeams.length < ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You need to have atleast two published teams." });
  }
};

const checkOrgOwnerCreationRequirements = async (
  orgOwnerEmail: string,
  slug: NonNullable<Team["slug"]>,
  loggedInUserId?: LoggedInUserType["id"],
  profileOrgId?: Profile["organizationId"] | null
) => {
  const orgOwner = await prisma.user.findUnique({
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

  if (!orgOwner) {
    // Create a new user and invite them as the owner of the organization
    throw new Error("Inviting a new user to be the owner of the organization is not supported yet");
  }

  // If we are making the loggedIn user the owner of the organization and he is already a part of an organization, we don't allow it because multi-org is not supported yet
  const isLoggedInUserOrgOwner = orgOwner.id === loggedInUserId;
  if (profileOrgId && isLoggedInUserOrgOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User is part of an organization already" });
  }

  return { orgOwner };
};

const configureOrg = async (orgOwnerEmail: string, slug: NonNullable<Team["slug"]>, t: TFunction) => {
  const isOrganizationConfigured = await createDomain(slug);

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
        t,
      });
    } else {
      console.warn("Organization created: subdomain not configured and couldn't notify adminnistrators");
    }
  }
  return isOrganizationConfigured;
};

type PersistOrganizationProps = {
  orgOwner: { id: User["id"]; username: User["username"] | null; email: User["email"] };
  input: CreateOptions["input"];
  isOrganizationConfigured: boolean;
  isAdmin: boolean;
  contextUserName: string | null;
};

const persistOrganization = async ({
  orgOwner,
  isOrganizationConfigured,
  isAdmin,
  input: { name, slug, language, pricePerSeat, seats, isPlatform },
  contextUserName,
}: PersistOrganizationProps) => {
  const autoAcceptEmail = orgOwner.email.split("@")[1];
  const nonOrgUsernameForOwner = orgOwner.username || "";
  const { organization, ownerProfile } = await OrganizationRepository.createWithOwner({
    orgData: {
      name,
      slug,
      isOrganizationConfigured,
      isOrganizationAdminReviewed: isAdmin,
      autoAcceptEmail,
      seats: seats ?? null,
      pricePerSeat: pricePerSeat ?? null,
      isPlatform,
    },
    owner: {
      id: orgOwner.id,
      email: orgOwner.email,
      nonOrgUsername: nonOrgUsernameForOwner,
    },
  });

  const translation = await getTranslation(language ?? "en", "common");

  await sendOrganizationCreationEmail({
    language: translation,
    from: contextUserName ?? `${organization.name}'s admin`,
    to: orgOwner.email,
    ownerNewUsername: ownerProfile.username,
    ownerOldUsername: nonOrgUsernameForOwner,
    orgDomain: getOrgFullOrigin(slug, { protocol: false }),
    orgName: organization.name,
    prevLink: `${getOrgFullOrigin("", { protocol: true })}/${nonOrgUsernameForOwner}`,
    newLink: `${getOrgFullOrigin(slug, { protocol: true })}/${ownerProfile.username}`,
  });

  return organization;
};

const checkLoginStatus = async (userId: number) => {
  const loggedInUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
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

const enrichUserProfile = async (
  organizationId: number,
  orgOwner: User,
  availability: {
    id: number;
    userId: number | null;
    eventTypeId: number | null;
    days: number[];
    startTime: Date;
    endTime: Date;
    date: Date | null;
    scheduleId: number | null;
  }[]
) => {
  const user = await UserRepository.enrichUserWithItsProfile({
    user: { ...orgOwner, organizationId: organizationId },
  });

  await prisma.availability.createMany({
    data: availability.map((schedule) => ({
      days: schedule.days,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      userId: user.id,
    })),
  });

  return user;
};

type CreatePlatformUserProps = {
  userId: number;
  profile: { username: null | string; orgId?: Profile["organizationId"] | null };
  team: { slug: NonNullable<Team["slug"]>; ownerEmail: string };
  input: CreateOptions["input"];
};

type CreateOrgProps = {
  userId: number;
  orgOwnerEmail: string;
  profile: { username: null | string; orgId?: Profile["organizationId"] | null };
  team: { slug: NonNullable<Team["slug"]>; ownerEmail: string };
  input: CreateOptions["input"];
  userLocale?: string;
};

const createPlatformUser = async ({
  userId,
  profile: { username, orgId },
  team: { slug, ownerEmail },
  input,
}: CreatePlatformUserProps) => {
  const loggedInUser = await checkLoginStatus(userId);

  const { orgOwner } = await checkOrgOwnerCreationRequirements(ownerEmail, slug, loggedInUser.id, orgId);

  const organization = await persistOrganization({
    orgOwner,
    input,
    isOrganizationConfigured: true,
    isAdmin: false,
    contextUserName: username,
  });

  if (!organization.id) throw Error("User not created");

  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
  const user = await enrichUserProfile(organization.id, orgOwner, availability);

  return { userId: user.id, email: user.email, organizationId: user.organizationId, upId: user.profile.upId };
};

const createOrg = async ({
  userId,
  orgOwnerEmail,
  userLocale,
  team: { slug, ownerEmail },
  profile: { username, orgId },
  input,
}: CreateOrgProps) => {
  const loggedInUser = await checkLoginStatus(userId);

  const isAdmin = checkUserIsAdmin(loggedInUser.role);

  checkOrgPublishedTeams(loggedInUser.teams, isAdmin);

  const { orgOwner } = await checkOrgOwnerCreationRequirements(ownerEmail, slug, loggedInUser.id, orgId);

  const t = await getTranslation(userLocale ?? "en", "common");

  const isOrganizationConfigured = await configureOrg(orgOwnerEmail, slug, t);

  const organization = await persistOrganization({
    orgOwner,
    input,
    isOrganizationConfigured,
    isAdmin: false,
    contextUserName: username,
  });
  if (!organization.id) throw Error("User not created");

  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
  const user = await enrichUserProfile(organization.id, orgOwner, availability);

  return { userId: user.id, email: user.email, organizationId: user.organizationId, upId: user.profile.upId };
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, orgOwnerEmail, isPlatform } = input;

  if (isPlatform) {
    createPlatformUser({
      userId: ctx.user.id,
      profile: { username: ctx.user.profile.username, orgId: ctx.user.profile.organizationId },
      team: { slug, ownerEmail: orgOwnerEmail },
      input,
    });
  } else {
    createOrg({
      userId: ctx.user.id,
      userLocale: ctx.user.locale,
      orgOwnerEmail,
      input,
      team: { slug, ownerEmail: orgOwnerEmail },
      profile: { username: ctx.user.profile.username, orgId: ctx.user.profile.organizationId },
    });
  }

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);
};

export default createHandler;
