import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";
import z from "zod";

import prisma from "@calcom/prisma";

import stripe, { StripeData } from "../lib/server";

const querySchema = z.object({
  code: z.string().default(""),
  error: z.string().optional().default(""),
  error_description: z.string().optional().default(""),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, error_description } = querySchema.parse(req.query);

  if (!code) {
    if (!!error) {
      const query = stringify({ error, error_description });
      res.redirect("/apps/installed?" + query);
      return;
    }
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
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
      userId: req.session.user.id,
      appId: "stripe",
    },
  });

  res.redirect("/apps/installed");
}
