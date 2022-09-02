import stripe from "stripepayment/lib/server";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { callbackUrl, checkoutSessionId } = req.query;
  const userId = req.session?.user.id;
  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const customerId = checkoutSession.customer;
  const customer = await stripe.customers.retrieve(customerId);
  if (checkoutSession.payment_status === "paid") {
    await prisma.user.update({
      data: {
        username: customer.metadata.username,
      },
      where: {
        id: userId,
      },
    });
    return res.redirect(`${WEBAPP_URL}${callbackUrl}`).end();
  } else {
    return res.json({
      message: "Couldn't complete payment. Your username is still not reserved.",
    });
  }
}
