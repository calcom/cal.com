import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

const client_id = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Check that user is authenticated
    const session = await getSession({ req: req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    // Get user
    await prisma.user.findFirst({
      where: {
        email: session.user?.email,
      },
      select: {
        id: true,
      },
    });

    const redirect_uri = encodeURI(process.env.BASE_URL + "/api/integrations/stripe/callback");
    const stripeConnectParams = {
      client_id,
      scope: "read_write",
      response_type: "code",
      "stripe_user[email]": session.user?.email,
      "stripe_user[first_name]": session.user?.name,
      redirect_uri,
    };
    const query = stringify(stripeConnectParams);
    const url = `https://connect.stripe.com/oauth/authorize?${query}`;

    res.status(200).json({ url });
  }
}
