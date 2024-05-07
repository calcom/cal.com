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

const checkUserIsAdmin = (
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
  const publishedTeams = teams.filter((team) => !!team.team.slug);
  if (!isAdmin && publishedTeams.length < ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You need to have atleast two published teams." });
  }
};

const enrichUserProfile = async (
  organizationId: number,
  orgOwner: User
  // availability: {
  //   id: number;
  //   userId: number | null;
  //   eventTypeId: number | null;
  //   days: number[];
  //   startTime: Date;
  //   endTime: Date;
  //   date: Date | null;
  //   scheduleId: number | null;
  // }[]
) => {
  const user = await UserRepository.enrichUserWithItsProfile({
    user: { ...orgOwner, organizationId },
  });

  // await prisma.availability.createMany({
  //   data: availability.map((schedule) => ({
  //     days: schedule.days,
  //     startTime: schedule.startTime,
  //     endTime: schedule.endTime,
  //     userId: user.id,
  //   })),
  // });

  return {
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId,
    upId: user.profile.upId,
  };
};

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, orgOwnerEmail, seats, pricePerSeat, isPlatform } = input;
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

  // split between two functions

  // start function checkOrgPublishedTeams from here
  const publishedTeams = loggedInUser.teams.filter((team) => !!team.team.slug);

  if (!IS_USER_ADMIN && publishedTeams.length < ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You need to have minimum published teams." });
  }
  // end function checkOrgPublishedTeams from here

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

  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

  const isOrganizationConfigured = isPlatform ? true : await createDomain(slug);
  const loggedInUserTranslation = await getTranslation(ctx.user.locale, "common");
  const inputLanguageTranslation = await getTranslation(input.language ?? "en", "common");

  // this I think is only for orgs
  // start here isOrgConfigured fn
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
