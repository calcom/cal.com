import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { getCustomerAndCheckoutSession } from "@calcom/app-store/stripepayment/lib/getCustomerAndCheckoutSession";
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

  // Pass email, username, and payment status in the redirect URL
  callbackUrl.searchParams.set("email", email || "");
  callbackUrl.searchParams.set("username", username);
  callbackUrl.searchParams.set("paymentStatus", checkoutSession.payment_status);

  return res.redirect(callbackUrl.toString()).end();
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
