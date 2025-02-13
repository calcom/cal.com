import {
  assertCanCreateOrg,
  findUserToBeOrgOwner,
} from "@calcom/features/ee/organizations/lib/server/orgCreationUtils";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TIntentToCreateOrgInputSchema } from "./intentToCreateOrg.schema";

const log = logger.getSubLogger({ prefix: ["intentToCreateOrgHandler"] });

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TIntentToCreateOrgInputSchema;
};

export const intentToCreateOrgHandler = async ({ input, ctx }: CreateOptions) => {
  const { slug, name, orgOwnerEmail, seats, pricePerSeat, billingPeriod, isPlatform } = input;
  log.debug(
    "Starting organization creation intent",
    safeStringify({ slug, name, orgOwnerEmail, isPlatform })
  );

  const loggedInUser = ctx.user;
  if (!loggedInUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "You are not authorized." });

  const IS_USER_ADMIN = loggedInUser.role === UserPermissionRole.ADMIN;
  log.debug("User authorization check", safeStringify({ userId: loggedInUser.id, isAdmin: IS_USER_ADMIN }));

  if (!IS_USER_ADMIN && loggedInUser.email !== orgOwnerEmail && !isPlatform) {
    log.warn(
      "Unauthorized organization creation attempt",
      safeStringify({ loggedInUserEmail: loggedInUser.email, orgOwnerEmail })
    );
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only create organization where you are the owner",
    });
  }

  const orgOwner = await findUserToBeOrgOwner(orgOwnerEmail);
  if (!orgOwner) {
    log.warn("Organization owner not found", safeStringify({ orgOwnerEmail }));
    // FIXME: Write logic to create new org user as per feat-payment-before-org-creation.md
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization owner doesn't exist. NEED TO IMPLEMENT THIS",
    });
  }
  log.debug("Found organization owner", safeStringify({ orgOwnerId: orgOwner.id, email: orgOwner.email }));

  await assertCanCreateOrg({
    slug,
    isPlatform,
    orgOwner,
    restrictBasedOnMinimumPublishedTeams: !IS_USER_ADMIN,
  });

  log.debug("Organization creation intent successful", safeStringify({ slug, orgOwnerId: orgOwner.id }));
  return {
    userId: orgOwner.id,
    orgOwnerEmail,
    name,
    slug,
    seats,
    pricePerSeat,
    billingPeriod,
    isPlatform,
  };
};

// export const createHandler = async ({ input, ctx }: CreateOptions) => {
//   const {
//     slug,
//     name,
//     orgOwnerEmail,
//     seats,
//     pricePerSeat,
//     isPlatform,
//     billingPeriod: billingPeriodRaw,
//     creationSource,
//   } = input;

// We only allow creating an annual billing period if you are a system admin
// const billingPeriod = (IS_USER_ADMIN ? billingPeriodRaw : BillingPeriod.MONTHLY) ?? BillingPeriod.MONTHLY;

//   const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

//   const ownerTranslation = await getTranslation(ctx.user.locale, "common");
//   const inputLanguageTranslation = await getTranslation(input.language ?? "en", "common");

//   const autoAcceptEmail = orgOwnerEmail.split("@")[1];

//   const orgData = {
//     name,
//     slug,
//     isOrganizationConfigured,
//     isOrganizationAdminReviewed: IS_USER_ADMIN,
//     autoAcceptEmail,
//     seats: seats ?? null,
//     pricePerSeat: pricePerSeat ?? null,
//     isPlatform,
//     billingPeriod,
//   };

//   // Create a new user and invite them as the owner of the organization
//   if (!orgOwner) {
//     const data = await OrganizationRepository.createWithNonExistentOwner({
//       orgData,
//       owner: {
//         email: orgOwnerEmail,
//       },
//       creationSource,
//     });

//     orgOwner = data.orgOwner;

//     const { organization, ownerProfile } = data;

//     const translation = await getTranslation(input.language ?? "en", "common");

//     await sendEmailVerification({
//       email: orgOwnerEmail,
//       language: ctx.user.locale,
//       username: ownerProfile.username || "",
//       isPlatform: isPlatform,
//     });

//     if (!isPlatform) {
//       await sendOrganizationCreationEmail({
//         language: translation,
//         from: ctx.user.name ?? `${organization.name}'s admin`,
//         to: orgOwnerEmail,
//         ownerNewUsername: ownerProfile.username,
//         ownerOldUsername: null,
//         orgDomain: getOrgFullOrigin(slug, { protocol: false }),
//         orgName: organization.name,
//         prevLink: null,
//         newLink: `${getOrgFullOrigin(slug, { protocol: true })}/${ownerProfile.username}`,
//       });
//     }

//     const user = await UserRepository.enrichUserWithItsProfile({
//       user: { ...orgOwner, organizationId: organization.id },
//     });

//     return {
//       userId: user.id,
//       email: user.email,
//       organizationId: user.organizationId,
//       upId: user.profile.upId,
//     };
//   } else {
//     const nonOrgUsernameForOwner = orgOwner.username || "";
//     const { organization, ownerProfile } = await OrganizationRepository.createWithExistingUserAsOwner({
//       orgData,
//       owner: {
//         id: orgOwner.id,
//         email: orgOwnerEmail,
//         nonOrgUsername: nonOrgUsernameForOwner,
//       },
//     });

//     if (!isPlatform) {
//       await sendOrganizationCreationEmail({
//         language: inputLanguageTranslation,
//         from: ctx.user.name ?? `${organization.name}'s admin`,
//         to: orgOwnerEmail,
//         ownerNewUsername: ownerProfile.username,
//         ownerOldUsername: nonOrgUsernameForOwner,
//         orgDomain: getOrgFullOrigin(slug, { protocol: false }),
//         orgName: organization.name,
//         prevLink: `${getOrgFullOrigin("", { protocol: true })}/${nonOrgUsernameForOwner}`,
//         newLink: `${getOrgFullOrigin(slug, { protocol: true })}/${ownerProfile.username}`,
//       });
//     }

//     if (!organization.id) throw Error("User not created");
//     const user = await UserRepository.enrichUserWithItsProfile({
//       user: { ...orgOwner, organizationId: organization.id },
//     });

//     await prisma.availability.createMany({
//       data: availability.map((schedule) => ({
//         days: schedule.days,
//         startTime: schedule.startTime,
//         endTime: schedule.endTime,
//         userId: user.id,
//       })),
//     });

//     return {
//       userId: user.id,
//       email: user.email,
//       organizationId: user.organizationId,
//       upId: user.profile.upId,
//     };
//   }
// };

export default intentToCreateOrgHandler;
