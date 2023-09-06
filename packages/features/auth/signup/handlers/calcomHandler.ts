import type { NextApiResponse } from "next";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getLocaleFromRequest } from "@calcom/lib/getLocaleFromRequest";
import { createWebUser as syncServicesCreateWebUser } from "@calcom/lib/sync/SyncServiceManager";
import prisma from "@calcom/prisma";

import { usernameHandler, type RequestWithUsernameStatus } from "../username";

async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  const { email: _email, password } = req.body;
  let username: string | null = req.usernameStatus.requestedUserName;
  let checkoutSessionId: string | null = null;

  // Check for premium username
  if (req.usernameStatus.statusCode === 418) {
    return res.status(req.usernameStatus.statusCode).json(req.usernameStatus.json);
  }

  // Validate the user
  if (!username) {
    res.status(422).json({ message: "Invalid username" });
    return;
  }

  if (typeof _email !== "string" || !_email.includes("@")) {
    res.status(422).json({ message: "Invalid email" });
    return;
  }

  const email = _email.toLowerCase();

  if (!password || password.trim().length < 7) {
    res.status(422).json({
      message: "Invalid input - password should be at least 7 characters long.",
    });
    return;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        {
          username,
        },
        {
          email,
        },
      ],
    },
  });

  if (existingUser) {
    res.status(422).json({ message: "A user exists with that email address" });
    return;
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

  if (checkoutSessionId) {
    res.status(402).json({
      message: "Created user but missing payment",
      checkoutSessionId,
    });
    return;
  }

  res.status(201).json({ message: "Created user", stripeCustomerId: customer.id });
}

export default usernameHandler(handler);
