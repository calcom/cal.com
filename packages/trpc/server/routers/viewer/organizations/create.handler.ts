import type { User, Team } from "@prisma/client";
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
  // start
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

const sendEmailAndEnrichProfile = async (isOrgOwner: boolean) => {
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

  // start function enrichUserProfile here
  // this should be handled in persistOrganizationWithExistingUserAsOwner fn
  if (isOrgOwner) {
    await createDefaultAvailability();
  }

  await enrichUserProfile();
};

const enrichUserProfile = async (organizationId: number, orgOwner: User) => {
  const user = await UserRepository.enrichUserWithItsProfile({
    user: { ...orgOwner, organizationId },
  });

  return {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    upId: user.profile.upId,
  };
};

const persistOrganizationWithExistingUserAsOwner = () => {
  // stuff for already existing owner
};

const persistOrganizationWithNonExistentOwner = () => {
  // stuff for non existing owner
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, orgOwnerEmail, seats, pricePerSeat, isPlatform } = input;

  const inputLanguageTranslation = await getTranslation(input.language ?? "en", "common");
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);
  const autoAcceptEmail = orgOwnerEmail.split("@")[1];

  const loggedInUser = await checkLoginStatus(ctx.user.id);
  const isOrganizationConfigured = isPlatform ? true : await createDomain(slug);

  const IS_USER_ADMIN = await checkOrgOwnerCreationRequirements({
    user: { email: loggedInUser.email, role: loggedInUser.role },
    org: { email: orgOwnerEmail, slug: slug },
    teams: loggedInUser.teams,
  });

  await createOrgDomainAndNotifyAdmins(isOrganizationConfigured, orgOwnerEmail, slug, ctx.user.locale);

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

  let orgOwner = await prisma.user.findUnique({
    where: {
      email: orgOwnerEmail,
    },
  });

  // have two separate functions for persist org
  // persistOrganizationWithNonExistentOwner
  // persistOrganizationWithExistingUserAsOwner
  // Create a new user and invite them as the owner of the organization
  if (!orgOwner) {
    const data = await OrganizationRepository.createWithNonExistentOwner({
      orgData,
      owner: {
        email: orgOwnerEmail,
      },
    });

    orgOwner = data.orgOwner;

    const { organization, ownerProfile } = data;

    const translation = await getTranslation(input.language ?? "en", "common");

    await sendEmailVerification({
      email: orgOwnerEmail,
      language: ctx.user.locale,
      username: ownerProfile.username || "",
    });

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

    const user = await UserRepository.enrichUserWithItsProfile({
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
      throw new TRPCError({ code: "FORBIDDEN", message: "User is part of an organization already" });
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

    if (!organization.id) throw Error("User not created");
    const user = await UserRepository.enrichUserWithItsProfile({
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

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);
};

export default createHandler;
