import { lookup } from "dns";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { sendAdminOrganizationNotification, sendOrganizationCreationEmail } from "@calcom/emails";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { RESERVED_SUBDOMAINS, WEBAPP_URL, ORG_SELF_SERVE_ENABLED } from "@calcom/lib/constants";
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

export const createHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, orgOwnerEmail, seats, pricePerSeat, isPlatform } = input;
  const IS_USER_ADMIN = ctx.user.role === UserPermissionRole.ADMIN;
  if (!ORG_SELF_SERVE_ENABLED && !IS_USER_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create organizations" });
  }

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
  const isLoggedInUserOrgOwner = orgOwner.id === ctx.user.id;
  if (ctx.user.profile.organizationId && isLoggedInUserOrgOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User is part of an organization already" });
  }

  const t = await getTranslation(ctx.user.locale ?? "en", "common");

  const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

  const isOrganizationConfigured = isPlatform ? true : await createDomain(slug);

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

  const autoAcceptEmail = orgOwnerEmail.split("@")[1];
  const nonOrgUsernameForOwner = ctx.user.profile.username || "";
  const { organization, ownerProfile } = await OrganizationRepository.createWithOwner({
    orgData: {
      name,
      slug,
      isOrganizationConfigured,
      isOrganizationAdminReviewed: IS_USER_ADMIN,
      autoAcceptEmail,
      seats: seats ?? null,
      pricePerSeat: pricePerSeat ?? null,
      isPlatform,
    },
    owner: {
      id: orgOwner.id,
      email: orgOwnerEmail,
      nonOrgUsername: nonOrgUsernameForOwner,
    },
  });

  const translation = await getTranslation(input.language ?? "en", "common");

  await sendOrganizationCreationEmail({
    language: translation,
    from: ctx.user.name ?? `${organization.name}'s admin`,
    to: orgOwnerEmail,
    ownerNewUsername: ownerProfile.username,
    ownerOldUsername: nonOrgUsernameForOwner,
    orgDomain: getOrgFullOrigin(slug, { protocol: false }),
    orgName: organization.name,
    prevLink: `${getOrgFullOrigin("", { protocol: true })}/${ctx.user.username}`,
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

  return { userId: user.id, email: user.email, organizationId: user.organizationId, upId: user.profile.upId };

  // Sync Services: Close.com
  //closeComUpsertOrganizationUser(createTeam, ctx.user, MembershipRole.OWNER);
};

export default createHandler;
