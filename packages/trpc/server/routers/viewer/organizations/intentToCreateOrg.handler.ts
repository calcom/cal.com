import { OrganizationPaymentService } from "@calcom/features/ee/organizations/lib/OrganizationPaymentService";
import {
  assertCanCreateOrg,
  findUserToBeOrgOwner,
} from "@calcom/features/ee/organizations/lib/server/orgCreationUtils";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
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
    // The flow exists to create the user through the stripe webhook invoice.paid but there could be a possible security issue with the approach. So, we avoid it currently.
    // Issue: As the onboarding link(which has onboardingId) could be used by unwanted person to pay and then invite some unwanted members to the organization.
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `No user found with email ${orgOwnerEmail}`,
    });
  }
  log.debug("Found organization owner", safeStringify({ orgOwnerId: orgOwner.id, email: orgOwner.email }));

  let organizationOnboarding = await OrganizationOnboardingRepository.findByOrgOwnerEmail(orgOwner.email);
  if (organizationOnboarding) {
    throw new Error("organization_onboarding_already_exists");
  }

  await assertCanCreateOrg({
    slug,
    isPlatform,
    orgOwner,
    restrictBasedOnMinimumPublishedTeams: !IS_USER_ADMIN,
  });

  const paymentService = new OrganizationPaymentService(ctx.user);
  organizationOnboarding = await paymentService.createOrganizationOnboarding({
    ...input,
    createdByUserId: loggedInUser.id,
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
    organizationOnboardingId: organizationOnboarding.id,
  };
};

export default intentToCreateOrgHandler;
