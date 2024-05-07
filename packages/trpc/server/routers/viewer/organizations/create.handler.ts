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

const getIPAddress = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    lookup(url, (err, address) => {
      if (err) reject(err);
      resolve(address);
    });
  });
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

const checkOrgPublishedTeams = (teams: LoggedInUserType["teams"], isAdmin: boolean) => {
  if (isAdmin) return;

  const publishedTeams = teams.filter((team) => !!team.team.slug);

  if (publishedTeams.length < ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You need to have atleast two published teams." });
  }
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

const createDefaultAvailability = async (
  availability: {
    id: number;
    userId: number | null;
    eventTypeId: number | null;
    days: number[];
    startTime: Date;
    endTime: Date;
    date: Date | null;
    scheduleId: number | null;
  }[],
  userId: number
) => {
  await prisma.availability.createMany({
    data: availability.map((schedule) => ({
      days: schedule.days,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      userId,
    })),
  });
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

const configureOrg = async (
  orgOwnerEmail: string,
  slug: NonNullable<Team["slug"]>,
  locale: string,
  language?: string
) => {
  const isOrganizationConfigured = await createDomain(slug);
  const loggedInUserTranslation = await getTranslation(locale, "common");
  const inputLanguageTranslation = await getTranslation(language ?? "en", "common");

  // this I think is only for orgs
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
  if (isOrgOwner) {
    await createDefaultAvailability();
  }

  await enrichUserProfile();
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

const persistOrganization = async (orgData: OrgData, orgOwnerEmail: string) => {
  const orgOwner = await prisma.user.findUnique({
    where: {
      email: orgOwnerEmail,
    },
  });

  if (!orgOwner) {
    // do stuff for not org owner
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

    await sendEmailAndEnrichProfile(false);
  } else {
    // do stuff for org owner
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

    // this will be standalone line
    if (!organization.id) throw Error("User not created");

    // this repeats for both if else cases
    await sendEmailAndEnrichProfile(true);
  }
};

const checkOrgOwnerCreationRequirements = async () => {
  // check for admin
  const isAdmin = checkUserIsAdminOrThrow();

  // check for published team
  checkOrgPublishedTeams();

  // check for url is taken or not
  await isOrgSlugTaken();

  return isAdmin;
};

const createOrgUser = async () => {
  const loggedInUser = await checkLoginStatus();

  const isAdmin = await checkOrgOwnerCreationRequirements();

  // this is also included for createPlatformOrg fn
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

  // this is also included for createPlatformOrg fn
  await configureOrg();

  // this is also included for createPlatformOrg fn
  await persistOrganization();
};

const createPlatformUser = async () => {
  const loggedInUser = await checkLoginStatus();

  // this is also included for createPlatformOrg fn
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

  // this is also included for createPlatformOrg fn
  await configureOrg();

  // this is also included for createPlatformOrg fn
  await persistOrganization();
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, orgOwnerEmail, seats, pricePerSeat, isPlatform } = input;
  // this is done under checkLoginStatus fn for create org
  const loggedInUser = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
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
  // this is done under checkLoginStatus fn for create org

  // this is done under checkUserIsAdminOrThrow fn for create org
  // start function checkUserIsAdmin from here
  const IS_USER_ADMIN = loggedInUser.role === UserPermissionRole.ADMIN;

  if (!ORG_SELF_SERVE_ENABLED && !IS_USER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create organizations" });
  }

  if (!IS_USER_ADMIN && loggedInUser.email !== orgOwnerEmail) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only create organization where you are the owner",
    });
  }
  // end function checkUserIsAdmin from here
  // this is done under checkUserIsAdminOrThrow fn for create org

  // split between two functions

  // this is done - checkOrgPublishedTeams fn name
  // start function checkOrgPublishedTeams from here
  const publishedTeams = loggedInUser.teams.filter((team) => !!team.team.slug);

  if (!IS_USER_ADMIN && publishedTeams.length < ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You need to have minimum published teams." });
  }
  // end function checkOrgPublishedTeams from here
  // this is done - checkOrgPublishedTeams fn name

  // start function check if org url has been taken or not
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
  // end function check if org url has been taken or not

  // this is also standalone
  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

  // isOrganizationConfigured is only for orgs, for plattform this is true
  // start here configureOrg fn
  const isOrganizationConfigured = isPlatform ? true : await createDomain(slug);
  const loggedInUserTranslation = await getTranslation(ctx.user.locale, "common");
  const inputLanguageTranslation = await getTranslation(input.language ?? "en", "common");

  // this I think is only for orgs
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
  // end here

  // maybe these two are also not standalone
  const autoAcceptEmail = orgOwnerEmail.split("@")[1];

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

  // this is standalone
  // maybe this can go under below one
  let orgOwner = await prisma.user.findUnique({
    where: {
      email: orgOwnerEmail,
    },
  });

  // Create a new user and invite them as the owner of the organization
  // new function will have to be created that checks if there is org owner or not
  // there will be lots of small small functions inside of it
  // persist organization function starts here
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

    // start function enrichUserProfile here
    const user = await UserRepository.enrichUserWithItsProfile({
      user: { ...orgOwner, organizationId: organization.id },
    });

    return {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      upId: user.profile.upId,
    };
    // end function enrichUserProfile here
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

    // this repeats for both if else cases
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

    // this will be standalone line
    if (!organization.id) throw Error("User not created");
    // start function enrichUserProfile here
    const user = await UserRepository.enrichUserWithItsProfile({
      user: { ...orgOwner, organizationId: organization.id },
    });

    // this doenst come under function enrichUserProfile
    // maybe create a separate fn for this
    // createDefaultAvailability or sum
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
    // end function enrichUserProfile here
  }
  // persist organization function ends here

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);
};

export default createHandler;
