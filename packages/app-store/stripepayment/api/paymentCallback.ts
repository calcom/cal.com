import stripe from "@calcom/app-store/stripepayment/lib/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

// It handles premium user payment success/failure. Can be modified to handle other PRO upgrade payment as well.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let { callbackUrl, checkoutSessionId } = req.query;
  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const customerId = checkoutSession.customer;
  const stripeCustomer = await stripe.customers.retrieve(customerId);
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
