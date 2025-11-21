import { randomBytes, createHash } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { getCustomerAndCheckoutSession } from "@calcom/app-store/stripepayment/lib/getCustomerAndCheckoutSession";
import sendVerificationRequest from "@calcom/features/auth/lib/sendVerificationRequest";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

const querySchema = z.object({
  callbackUrl: z.string().transform((url) => {
    if (url.search(/^https?:\/\//) === -1) {
      url = `${WEBAPP_URL}${url}`;
    }
    return new URL(url);
  }),
  checkoutSessionId: z.string(),
});

// It handles premium user payment success/failure
async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { callbackUrl, checkoutSessionId } = querySchema.parse(req.query);
  const log = logger.getSubLogger({ prefix: [`[paymentCallback] checkoutSessionId: ${checkoutSessionId}`] });
  const { stripeCustomer, checkoutSession } = await getCustomerAndCheckoutSession(checkoutSessionId);

  if (!stripeCustomer) {
    log.error("Could not find stripeCustomer");
    throw new HttpError({
      statusCode: 404,
      message:
        "Stripe customer not found or deleted.  Please contact support@cal.com and mention your premium username",
      url: req.url,
      method: req.method,
    });
  }

  let user = await prisma.user.findFirst({
    where: {
      email: stripeCustomer.email,
    },
    select: {
      id: true,
      email: true,
      locale: true,
      metadata: true,
    },
  });

  // If we cannot find the user via email, query via stripeCustomerId
  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        metadata: {
          path: ["stripeCustomerId"],
          equals: stripeCustomer.id,
        },
      },
      select: {
        id: true,
        email: true,
        locale: true,
        metadata: true,
      },
    });
  }

  if (!user) {
    log.error("Could not find user");
    throw new HttpError({ statusCode: 404, message: "User not found", url: req.url, method: req.method });
  }
  const username = stripeCustomer.metadata.username;
  const email = user.email || stripeCustomer.email;

  if (checkoutSession.payment_status === "paid" && stripeCustomer.metadata.username) {
    try {
      await prisma.user.update({
        data: {
          username,
          metadata: {
            ...(user.metadata as Prisma.JsonObject),
            isPremium: true,
          },
        },
        where: {
          id: user.id,
        },
      });
    } catch (error) {
      log.error(error);
      throw new HttpError({
        statusCode: 400,
        url: req.url,
        method: req.method,
        message:
          "We have received your payment. Your premium username could still not be reserved. Please contact support@cal.com and mention your premium username",
      });
    }
  }

  // Generate a verification token for NextAuth
  const token = randomBytes(32).toString("hex");
  const ONE_DAY_IN_SECONDS = 86400;
  const expires = new Date(Date.now() + ONE_DAY_IN_SECONDS * 1000);

  // Create verification token in database
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: createHash("sha256").update(`${token}${process.env.NEXTAUTH_SECRET}`).digest("hex"),
      expires,
    },
  });

  // Generate the callback URL with token
  const params = new URLSearchParams({
    callbackUrl: WEBAPP_URL || "https://app.cal.com",
    token,
    email,
  });
  const url = `${WEBAPP_URL}/api/auth/callback/email?${params.toString()}`;

  await sendVerificationRequest({
    identifier: email,
    url,
    provider: { from: process.env.EMAIL_FROM || "noreply@cal.com" },
    theme: { colorScheme: "auto" },
  });

  // Pass email, username, and payment status in the redirect URL
  callbackUrl.searchParams.set("email", email || "");
  callbackUrl.searchParams.set("username", username);
  callbackUrl.searchParams.set("paymentStatus", checkoutSession.payment_status);

  return res.redirect(callbackUrl.toString()).end();
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
