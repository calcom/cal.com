import { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { getCustomerAndCheckoutSession } from "@calcom/app-store/stripepayment/lib/getCustomerAndCheckoutSession";
import stripe from "@calcom/app-store/stripepayment/lib/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

const querySchema = z.object({
  callbackUrl: z.string(),
  checkoutSessionId: z.string(),
});

// It handles premium user payment success/failure. Can be modified to handle other PRO upgrade payment as well.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parsedQuerySchema = querySchema.parse(req.query);
  let { callbackUrl } = parsedQuerySchema;
  const { checkoutSessionId } = parsedQuerySchema;
  const { stripeCustomer, checkoutSession } = await getCustomerAndCheckoutSession(checkoutSessionId);
  if (!stripeCustomer) {
    res.json({
      message: "Stripe customer not found or deleted",
    });
    return;
  }
  const boughtUsername = stripeCustomer.metadata.username;
  const email = stripeCustomer.metadata.email;
  if (checkoutSession.payment_status === "paid") {
    try {
      await prisma.user.update({
        data: {
          username: boughtUsername,
        },
        where: {
          email,
        },
      });
    } catch (error) {
      console.error(error);
      return res.json({
        message:
          "We have received your payment. Your premium username could still not be reserved. Please contact support@cal.com and mention your premium username",
      });
    }
  }

  if (callbackUrl.search(/^https?:\/\//) === -1) {
    callbackUrl = `${WEBAPP_URL}${callbackUrl}`;
  }

  const parsedCallbackUrl = new URL(callbackUrl);
  parsedCallbackUrl.searchParams.set("paymentStatus", checkoutSession.payment_status);
  return res.redirect(parsedCallbackUrl.toString()).end();
}
