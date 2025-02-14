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
    log.debug(
      "Organization owner not found, allowing to go ahead with onboarding",
      safeStringify({ email: orgOwnerEmail, IS_USER_ADMIN })
    );
    return {
      userId: null,
      orgOwnerEmail,
      name,
      slug,
      seats,
      pricePerSeat,
      billingPeriod,
      isPlatform,
    };
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

export default intentToCreateOrgHandler;
