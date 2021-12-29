import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { getSession } from "@lib/auth";
import { PAYMENT_INTEGRATIONS_TYPES } from "@lib/integrations/payment/constants/generals";
import { STRIPE } from "@lib/integrations/payment/constants/stripeConstats";
import { StripeData } from "@lib/integrations/payment/constants/types";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, error_description } = req.query;
  // Check that user is authenticated
  const session = await getSession({ req: req });

  if (!session?.user) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  if (error) {
    const query = stringify({ error, error_description });
    res.redirect("/integrations?" + query);
    return;
  }

  const response = await STRIPE.oauth.token({
    grant_type: "authorization_code",
    code: code.toString(),
  });

  const data: StripeData = { ...response, default_currency: "" };
  if (response["stripe_user_id"]) {
    const account = await STRIPE.accounts.retrieve(response["stripe_user_id"]);
    data["default_currency"] = account.default_currency;
  }

  await prisma.credential.create({
    data: {
      type: PAYMENT_INTEGRATIONS_TYPES.stripe,
      key: data as unknown as Prisma.InputJsonObject,
      userId: session.user.id,
    },
  });

  res.redirect("/integrations");
}
