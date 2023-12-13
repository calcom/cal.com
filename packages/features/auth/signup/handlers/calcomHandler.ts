import type { NextApiResponse } from "next";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getLocaleFromRequest } from "@calcom/lib/getLocaleFromRequest";
import { HttpError } from "@calcom/lib/http-error";
import { usernameHandler, type RequestWithUsernameStatus } from "@calcom/lib/server/username";
import { createWebUser as syncServicesCreateWebUser } from "@calcom/lib/sync/SyncServiceManager";
import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/lib/validateUsername";
import { prisma } from "@calcom/prisma";
import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";
import { signupSchema, teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { joinAnyChildTeamOnOrgInvite } from "../utils/organization";
import {
  findTokenByToken,
  throwIfTokenExpired,
  validateAndGetCorrectedUsernameForTeam,
} from "../utils/token";

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
      payment_method_types: ["card"],
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
    });
    if (team) {
      const teamMetadata = teamMetadataSchema.parse(team?.metadata);

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          username,
          password: hashedPassword,
          emailVerified: new Date(Date.now()),
          identityProvider: IdentityProvider.CAL,
        },
        create: {
          username,
          email,
          password: hashedPassword,
          identityProvider: IdentityProvider.CAL,
        },
      });

      // Wrapping in a transaction as if one fails we want to rollback the whole thing to preventa any data inconsistencies
      const membership = await prisma.$transaction(async (tx) => {
        if (teamMetadata?.isOrganization) {
          await tx.user.update({
            where: {
              id: user.id,
            },
            data: {
              organizationId: team.id,
            },
          });
        }
        const membership = await tx.membership.upsert({
          where: {
            userId_teamId: { userId: user.id, teamId: team.id },
          },
          update: {
            accepted: true,
          },
          create: {
            userId: user.id,
            teamId: team.id,
            role: MembershipRole.MEMBER,
            accepted: true,
          },
        });
        return membership;
      });

      closeComUpsertTeamUser(team, user, membership.role);

      // Accept any child team invites for orgs.
      if (team.parentId) {
        await joinAnyChildTeamOnOrgInvite({
          userId: user.id,
          orgId: team.parentId,
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
        password: hashedPassword,
        metadata: {
          stripeCustomerId: customer.id,
          checkoutSessionId,
        },
      },
    });

    sendEmailVerification({
      email,
      language: await getLocaleFromRequest(req),
      username: username || "",
    });
    // Sync Services
    await syncServicesCreateWebUser(user);
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
