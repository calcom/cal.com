import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import stripe, { StripeData } from "@ee/lib/stripe/server";

import { getSession } from "@lib/auth";
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

  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code: code.toString(),
  });

  const data: StripeData = { ...response, default_currency: "" };
  if (response["stripe_user_id"]) {
    const account = await stripe.accounts.retrieve(response["stripe_user_id"]);
    data["default_currency"] = account.default_currency;
  }

  await prisma.credential.create({
    data: {
      type: "stripe_payment",
      key: data as unknown as Prisma.InputJsonObject,
      userId: session.user.id,
    },
  });

  res.redirect("/integrations");
}
