import type { NextApiResponse } from "next";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { IS_CALCOM } from "@calcom/lib/constants";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getLocaleFromRequest } from "@calcom/lib/getLocaleFromRequest";
import { HttpError } from "@calcom/lib/http-error";
import type { RequestWithUsernameStatus } from "@calcom/lib/server/username";
import slugify from "@calcom/lib/slugify";
import { createWebUser as syncServicesCreateWebUser } from "@calcom/lib/sync/SyncServiceManager";
import { signupSchema } from "@calcom/prisma/zod-utils";

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

function ensurePostMethod(req: RequestWithUsernameStatus, res: NextApiResponse) {
  if (req.method !== "POST") {
    throw new HttpError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }
}

function throwIfSignupIsDisabled() {
  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true") {
    throw new HttpError({
      statusCode: 403,
      message: "Signup is disabled",
    });
  }
}

function parseSignupData(data: unknown) {
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

async function handlePremiumUsernameFlow({
  email,
  username,
  premiumUsernameStatusCode,
}: {
  email: string;
  username: string;
  premiumUsernameStatusCode: number;
}) {
  if (!IS_CALCOM) return;
  const metadata: {
    stripeCustomerId?: string;
    checkoutSessionId?: string;
  } = {};

  // Create the customer in Stripe
  const customer = await stripe.customers.create({
    email,
    metadata: {
      email /* Stripe customer email can be changed, so we add this to keep track of which email was used to signup */,
      username,
    },
  });

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

function createUser({
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

function syncServicesCreateUser(user: Awaited<ReturnType<typeof createUser>>) {
  return IS_CALCOM && syncServicesCreateWebUser(user);
}

function sendVerificationEmail({
  email,
  language,
  username,
}: {
  email: string;
  language: string;
  username: string;
}) {
  if (!IS_CALCOM) return;
  return sendEmailVerification({
    email,
    language,
    username: username || "",
  });
}

export default async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  try {
    ensurePostMethod(req, res);
    throwIfSignupIsDisabled();
    const { email, password, language, token, username } = parseSignupData(req.body);
    await findExistingUser(username, email);
    const hashedPassword = await hashPassword(password);
    const premiumUsernameMetadata = await handlePremiumUsernameFlow({
      email,
      username,
      premiumUsernameStatusCode: req.usernameStatus.statusCode,
    });

    // Create the user
    const user = await createUser({
      username,
      email,
      hashedPassword,
      metadata: premiumUsernameMetadata,
    });
    await sendEmailVerification({
      email,
      language: await getLocaleFromRequest(req),
      username: username || "",
    });
    await syncServicesCreateUser(user);

    if (IS_CALCOM && premiumUsernameMetadata) {
      if (premiumUsernameMetadata.checkoutSessionId) {
        return res.status(402).json({
          message: "Created user but missing payment",
          checkoutSessionId: premiumUsernameMetadata.checkoutSessionId,
        });
      }
      return res
        .status(201)
        .json({ message: "Created user", stripeCustomerId: premiumUsernameMetadata.stripeCustomerId });
    }
  } catch (e) {
    if (e instanceof HttpError) {
      return res.status(e.statusCode).json({ message: e.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }

  // if (IS_CALCOM) {
  //   // return await hostedHandler(req, res);
  // } else {
  //   return await selfHostedHandler(req, res);
  // }
}
