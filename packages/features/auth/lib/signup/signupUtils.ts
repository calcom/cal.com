import type Stripe from "stripe";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { IS_CALCOM, WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import type { RequestWithUsernameStatus } from "@calcom/lib/server/username";
import slugify from "@calcom/lib/slugify";
import { createWebUser as syncServicesCreateWebUser } from "@calcom/lib/sync/SyncServiceManager";
import { signupSchema } from "@calcom/prisma/zod-utils";

import { sendEmailVerification } from "../verifyEmail";

export async function findExistingUser(username: string, email: string) {
  const user = await prisma.user.findFirst({
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
  if (user) {
    throw new HttpError({
      statusCode: 442,
      message: "A user exists with that email address",
    });
  }
}

export function ensurePostMethod(req: RequestWithUsernameStatus) {
  if (req.method !== "POST") {
    throw new HttpError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }
}

export function throwIfSignupIsDisabled() {
  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true") {
    throw new HttpError({
      statusCode: 403,
      message: "Signup is disabled",
    });
  }
}

export function parseSignupData(data: unknown) {
  const parsedSchema = signupSchema.safeParse(data);
  if (!parsedSchema.success) {
    throw new HttpError({
      statusCode: 422,
      message: "Invalid input",
    });
  }
  return {
    ...parsedSchema.data,
    email: parsedSchema.data.email.toLowerCase(),
    username: slugify(parsedSchema.data.username),
  };
}
export async function createStripeCustomer({ email, username }: { email: string; username: string }) {
  // Create the customer in Stripe
  const customer = await stripe.customers.create({
    email,
    metadata: {
      email /* Stripe customer email can be changed, so we add this to keep track of which email was used to signup */,
      username,
    },
  });

  return customer;
}

export async function handlePremiumUsernameFlow({
  customer,
  premiumUsernameStatusCode,
}: {
  premiumUsernameStatusCode: number;
  customer?: Stripe.Customer;
}) {
  if (!IS_CALCOM) return;

  if (!customer) {
    throw new HttpError({
      statusCode: 500,
      message: "Missing customer",
    });
  }

  const returnUrl = `${WEBAPP_URL}/api/integrations/stripepayment/paymentCallback?checkoutSessionId={CHECKOUT_SESSION_ID}&callbackUrl=/auth/verify?sessionId={CHECKOUT_SESSION_ID}`;

  if (premiumUsernameStatusCode === 402) {
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
    metadata["stripeCustomerId"] = customer.id;
    metadata["checkoutSessionId"] = checkoutSession.id;
  }

  return metadata;
}

export function createUser({
  username,
  email,
  hashedPassword,
  metadata,
}: {
  username: string;
  email: string;
  hashedPassword: string;
  metadata?: {
    stripeCustomerId?: string;
    checkoutSessionId?: string;
  };
}) {
  return prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      metadata,
    },
  });
}

export function syncServicesCreateUser(user: Awaited<ReturnType<typeof createUser>>) {
  return IS_CALCOM && syncServicesCreateWebUser(user);
}

export function sendVerificationEmail({
  email,
  language,
  username,
}: {
  email: string;
  language: string;
  username: string;
}) {
  return sendEmailVerification({
    email,
    language,
    username: username || "",
  });
}
