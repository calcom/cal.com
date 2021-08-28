import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

const client_id = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;
const client_secret = process.env.STRIPE_SECRET_KEY;

const makeStripeConnectRequest = async (code: string) => {
  const params = {
    grant_type: "authorization_code",
    client_id,
    client_secret,
    code: code,
  };

  const url = "https://connect.stripe.com/oauth/token";
  return await fetch(url, {
    method: "POST",
    body: JSON.stringify(params),
    headers: { "Content-Type": "application/json" },
  }).then((res) => res.json());
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  // Check that user is authenticated
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  // 1) Post the authorization code to Stripe to complete the Express onboarding flow
  const stripeConnectRequest = await makeStripeConnectRequest(code as string);

  // 2) Update the users platform  with StripeUserId
  const stripeUserId = stripeConnectRequest.stripe_user_id;

  if (!stripeUserId) {
    return res.status(400).json({ msg: "Connect request to Stripe failed" });
  }

  await prisma.credential.create({
    data: {
      type: "stripe",
      key: stripeConnectRequest,
      userId: session.user?.id,
    },
  });

  res.redirect("/integrations");
}
