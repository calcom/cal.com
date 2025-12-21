import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { getLocaleFromRequest } from "@calcom/features/auth/lib/getLocaleFromRequest";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { prefillAvatar } from "@calcom/features/auth/signup/utils/prefillAvatar";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/features/auth/signup/utils/validateUsername";
import { getBillingProviderService } from "@calcom/features/ee/billing/di/containers/Billing";
import { sentrySpan } from "@calcom/features/watchlist/lib/telemetry";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import type { CustomNextApiHandler } from "@calcom/lib/server/username";
import { usernameHandler } from "@calcom/lib/server/username";
import { prisma } from "@calcom/prisma";
import { CreationSource } from "@calcom/prisma/enums";
import { IdentityProvider } from "@calcom/prisma/enums";
import { signupSchema } from "@calcom/prisma/zod-utils";
import { buildLegacyRequest } from "@calcom/web/lib/buildLegacyCtx";

import { joinAnyChildTeamOnOrgInvite } from "../utils/organization";
import {
  findTokenByToken,
  throwIfTokenExpired,
  validateAndGetCorrectedUsernameForTeam,
} from "../utils/token";

const log = logger.getSubLogger({ prefix: ["signupCalcomHandler"] });

const handler: CustomNextApiHandler = async (body, usernameStatus) => {
  const {
    email: _email,
    password,
    token,
  } = signupSchema
    .pick({
      email: true,
      password: true,
      token: true,
    })
    .parse(body);

  const billingService = getBillingProviderService();

  const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController({
    email: _email,
    organizationId: null,
    span: sentrySpan,
  });

  log.debug("handler", { email: _email });

  let username: string | null = usernameStatus.requestedUserName;
  let checkoutSessionId: string | null = null;

  // Check for premium username
  if (usernameStatus.statusCode === 418) {
    return NextResponse.json(usernameStatus.json, { status: 418 });
  }

  // Validate the user
  if (!username) {
    throw new HttpError({
      statusCode: 422,
      message: "Invalid username",
    });
  }

  const email = _email.toLowerCase();

  let foundToken: { id: number; teamId: number | null; expires: Date } | null = null;
  if (token) {
    foundToken = await findTokenByToken({ token });
    throwIfTokenExpired(foundToken?.expires);
    username = await validateAndGetCorrectedUsernameForTeam({
      username,
      email,
      teamId: foundToken?.teamId ?? null,
      isSignup: true,
    });
  } else {
    const usernameAndEmailValidation = await validateAndGetCorrectedUsernameAndEmail({
      username,
      email,
      isSignup: true,
    });
    if (!usernameAndEmailValidation.isValid) {
      throw new HttpError({
        statusCode: 409,
        message: "Username or email is already taken",
      });
    }

    if (!usernameAndEmailValidation.username) {
      throw new HttpError({
        statusCode: 422,
        message: "Invalid username",
      });
    }

    username = usernameAndEmailValidation.username;
  }

  // Create the customer in Stripe

  const customer = await billingService.createCustomer({
    email,
    metadata: {
      email /* Stripe customer email can be changed, so we add this to keep track of which email was used to signup */,
      username,
    },
  });

  const returnUrl = `${WEBAPP_URL}/api/integrations/stripepayment/paymentCallback?checkoutSessionId={CHECKOUT_SESSION_ID}&callbackUrl=/auth/verify?sessionId={CHECKOUT_SESSION_ID}`;

  // Pro username, must be purchased
  if (usernameStatus.statusCode === 402) {
    const checkoutSession = await billingService.createSubscriptionCheckout({
      mode: "subscription",
      customerId: customer.stripeCustomerId,
      successUrl: returnUrl,
      cancelUrl: returnUrl,
      priceId: getPremiumMonthlyPlanPriceId(),
      quantity: 1,
      allowPromotionCodes: true,
    });

    /** We create a username-less user until he pays */
    checkoutSessionId = checkoutSession.sessionId;
    username = null;
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  if (foundToken && foundToken?.teamId) {
    const team = await prisma.team.findUnique({
      where: {
        id: foundToken.teamId,
      },
      include: {
        parent: {
          select: {
            id: true,
            slug: true,
            organizationSettings: true,
          },
        },
        organizationSettings: true,
      },
    });
    if (team) {
      const organizationId = team.isOrganization ? team.id : team.parent?.id ?? null;
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          username,
          emailVerified: new Date(Date.now()),
          identityProvider: IdentityProvider.CAL,
          password: {
            upsert: {
              create: { hash: hashedPassword },
              update: { hash: hashedPassword },
            },
          },
          organizationId,
        },
        create: {
          username,
          email,
          identityProvider: IdentityProvider.CAL,
          password: { create: { hash: hashedPassword } },
          organizationId,
        },
      });
      // Wrapping in a transaction as if one fails we want to rollback the whole thing to preventa any data inconsistencies
      await createOrUpdateMemberships({
        user,
        team,
      });

      // Accept any child team invites for orgs.
      if (team.parent) {
        await joinAnyChildTeamOnOrgInvite({
          userId: user.id,
          org: team.parent,
        });
      }
    }

    // Cleanup token after use
    await prisma.verificationToken.delete({
      where: {
        id: foundToken.id,
      },
    });
  } else {
    // Create the user
    await prisma.user.create({
      data: {
        username,
        email,
        locked: shouldLockByDefault,
        password: { create: { hash: hashedPassword } },
        metadata: {
          stripeCustomerId: customer.stripeCustomerId,
          checkoutSessionId,
        },
        creationSource: CreationSource.WEBAPP,
      },
    });
    if (process.env.AVATARAPI_USERNAME && process.env.AVATARAPI_PASSWORD) {
      await prefillAvatar({ email });
    }
    // Only send verification email for non-premium usernames
    // Premium usernames will get a magic link after payment in paymentCallback
    if (!checkoutSessionId) {
      sendEmailVerification({
        email,
        language: await getLocaleFromRequest(buildLegacyRequest(await headers(), await cookies())),
        username: username || "",
      });
    }
  }

  if (checkoutSessionId) {
    console.log("Created user but missing payment", checkoutSessionId);
    return NextResponse.json(
      { message: "Created user but missing payment", checkoutSessionId },
      { status: 402 }
    );
  }

  return NextResponse.json(
    { message: "Created user", stripeCustomerId: customer.stripeCustomerId },
    { status: 201 }
  );
};

export default usernameHandler(handler);
