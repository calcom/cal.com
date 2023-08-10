import type { NextApiRequest, NextApiResponse } from "next";
import stringify from "qs-stringify";
import { z } from "zod";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get user
    const user = await prisma.user.findUnique({
      where: {
        id: req.session?.user?.id,
      },
      select: {
        email: true,
        name: true,
      },
    });

    const client_id = "5719933161091.572251138641812";

    const redirect_uri = encodeURI(
      "https://69b3-2405-201-c02d-983c-d8bb-586d-f127-fda7.ngrok-free.app" +
        "/api/integrations/slack/callback"
    );
    const slackConnectParams = {
      client_id,
      scope: "incoming-webhook",
      redirect_uri,
    };
    /** stringify is being dumb here */
    const params = z.record(z.any()).parse(slackConnectParams);
    const query = stringify(params);
    /**
     * Choose Express or Standard Stripe accounts
     * @url https://stripe.com/docs/connect/accounts
     */
    // const url = `https://connect.stripe.com/express/oauth/authorize?${query}`;
    const url = `https://slack.com/oauth/v2/authorize?${query}`;

    console.log("========slack url=========");
    console.log(url);

    res.status(200).json({ url });
  }
}
