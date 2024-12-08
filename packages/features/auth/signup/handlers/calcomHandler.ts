import type { NextApiResponse } from "next";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { createOrUpdateMemberships } from "@calcom/features/auth/signup/utils/createOrUpdateMemberships";
import { prefillAvatar } from "@calcom/features/auth/signup/utils/prefillAvatar";
import { checkIfEmailInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getLocaleFromRequest } from "@calcom/lib/getLocaleFromRequest";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { usernameHandler, type RequestWithUsernameStatus } from "@calcom/lib/server/username";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/lib/validateUsername";
import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { signupSchema } from "@calcom/prisma/zod-utils";

import { joinAnyChildTeamOnOrgInvite } from "../utils/organization";
import {
  findTokenByToken,
  throwIfTokenExpired,
  validateAndGetCorrectedUsernameForTeam,
} from "../utils/token";

const log = logger.getSubLogger({ prefix: ["signupCalcomHandler"] });

async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
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
    .parse(req.body);

  const shouldLockByDefault = await checkIfEmailInWatchlistController(_email);

  log.debug("handler", { email: _email });

  let username: string | null = req.usernameStatus.requestedUserName;
  let checkoutSessionId: string | null = null;

  // Check for premium username
  if (req.usernameStatus.statusCode === 418) {
    return res.status(req.usernameStatus.statusCode).json(req.usernameStatus.json);
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
  const customer = await stripe.customers.create({
    email,
    metadata: {
      email /* Stripe customer email can be changed, so we add this to keep track of which email was used to signup */,
      username,
    },
  });

  const returnUrl = `${WEBAPP_URL}/api/integrations/stripepayment/paymentCallback?checkoutSessionId={CHECKOUT_SESSION_ID}&callbackUrl=/auth/verify?sessionId={CHECKOUT_SESSION_ID}`;

  // Pro username, must be purchased
  if (req.usernameStatus.statusCode === 402) {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [
        {
          price: getPremiumMonthlyPlanPriceId(),
          quantity: 1,
        },
      ],
      success_url: returnUrl,
      cancel_url: returnUrl,
      allow_promotion_codes: true,
    });

    /** We create a username-less user until he pays */
    checkoutSessionId = checkoutSession.id;
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
        },
        create: {
          username,
          email,
          identityProvider: IdentityProvider.CAL,
          password: { create: { hash: hashedPassword } },
        },
      });
      // Wrapping in a transaction as if one fails we want to rollback the whole thing to preventa any data inconsistencies
      const { membership } = await createOrUpdateMemberships({
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
    const user = await prisma.user.create({
      data: {
        username,
        email,
        locked: shouldLockByDefault,
        password: { create: { hash: hashedPassword } },
        metadata: {
          stripeCustomerId: customer.id,
          checkoutSessionId,
        },
      },
    });
    if (process.env.AVATARAPI_USERNAME && process.env.AVATARAPI_PASSWORD) {
      await prefillAvatar({ email });
    }
    sendEmailVerification({
      email,
      language: await getLocaleFromRequest(req),
      username: username || "",
    });
  }

  if (checkoutSessionId) {
    console.log("Created user but missing payment", checkoutSessionId);
    return res.status(402).json({
      message: "Created user but missing payment",
      checkoutSessionId,
    });
  }

  return res.status(201).json({ message: "Created user", stripeCustomerId: customer.id });
}

export default usernameHandler(handler);
