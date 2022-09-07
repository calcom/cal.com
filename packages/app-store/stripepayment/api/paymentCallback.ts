import { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { getCustomerAndCheckoutSession } from "@calcom/app-store/stripepayment/lib/getCustomerAndCheckoutSession";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { prisma } from "@calcom/prisma";

const querySchema = z.object({
  callbackUrl: z.string().transform((url) => {
    if (url.search(/^https?:\/\//) === -1) {
      url = `${WEBAPP_URL}${url}`;
    }
    return new URL(url);
  }),
  checkoutSessionId: z.string(),
});

// It handles premium user payment success/failure. Can be modified to handle other PRO upgrade payment as well.
async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { callbackUrl, checkoutSessionId } = querySchema.parse(req.query);
  const { stripeCustomer, checkoutSession } = await getCustomerAndCheckoutSession(checkoutSessionId);

  if (!stripeCustomer) return { message: "Stripe customer not found or deleted" };

  if (checkoutSession.payment_status === "paid") {
    console.log("Found payment ");
    try {
      await prisma.user.update({
        data: {
          username: stripeCustomer.metadata.username,
        },
        where: {
          email: stripeCustomer.metadata.email,
        },
      });
    } catch (error) {
      console.error(error);
      return {
        message:
          "We have received your payment. Your premium username could still not be reserved. Please contact support@cal.com and mention your premium username",
      };
    }
  }
  callbackUrl.searchParams.set("paymentStatus", checkoutSession.payment_status);
  return res.redirect(callbackUrl.toString()).end();
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
