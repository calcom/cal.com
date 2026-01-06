import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { OrganizationOnboardingFactory } from "@calcom/ee/organizations/lib/service/onboarding/OrganizationOnboardingFactory";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import {
  assertCanCreateOrg,
  findUserToBeOrgOwner,
} from "@calcom/features/ee/organizations/lib/server/orgCreationUtils";
import { OrganizationOnboardingRepository } from "@calcom/features/organizations/repositories/OrganizationOnboardingRepository";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
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
  const { slug, name, orgOwnerEmail, isPlatform } = input;
  log.debug(
    "Starting organization creation intent",
    safeStringify({ slug, name, orgOwnerEmail, isPlatform })
  );

  if (IS_SELF_HOSTED) {
    const deploymentRepo = new DeploymentRepository(prisma);
    const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
    const hasValidLicense = await licenseKeyService.checkLicense();

    if (!hasValidLicense) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "License is not valid",
      });
    }
  }

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

  const organizationOnboarding = await OrganizationOnboardingRepository.findByOrgOwnerEmail(orgOwner.email);

  // If onboarding exists and is incomplete, this is a resume flow (e.g., admin handover)
  // Allow proceeding with the existing onboarding record
  if (organizationOnboarding) {
    if (organizationOnboarding.isComplete) {
      // Organization already created - shouldn't create another one
      throw new Error("organization_onboarding_already_exists");
    }

    // Incomplete onboarding exists - this is expected for resume/handover flows
    log.debug(
      "Found incomplete onboarding record - proceeding with resume flow",
      safeStringify({ onboardingId: organizationOnboarding.id, slug })
    );

    // Use existing onboarding ID for the resume flow
    input.onboardingId = organizationOnboarding.id;
  }

  await assertCanCreateOrg({
    slug,
    isPlatform,
    orgOwner,
    restrictBasedOnMinimumPublishedTeams: !IS_USER_ADMIN,
  });

  const onboardingService = OrganizationOnboardingFactory.create({
    id: ctx.user.id,
    email: ctx.user.email,
    role: ctx.user.role,
  });
  const result = await onboardingService.createOnboardingIntent(input);

  log.debug("Organization creation intent successful", safeStringify({ slug, orgOwnerId: orgOwner.id }));

  return result;
};

export default intentToCreateOrgHandler;
