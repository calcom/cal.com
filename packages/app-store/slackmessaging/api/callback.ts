import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import prisma from "@calcom/prisma";

const client_id = process.env.SLACK_CLIENT_ID;
const client_secret = process.env.SLACK_CLIENT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  if (req.method === "GET") {
    // Get user
    const { code } = req.query;

    if (!code) {
      res.redirect("/apps/installed"); // Redirect to where the user was if they cancel the signup or if the oauth fails
    }

    const query = {
      client_secret,
      client_id,
      code,
    };
    const params = stringify(query);
    console.log("params", params);

    const url = `https://slack.com/api/oauth.v2.access?${params}`;
    const result = await fetch(url);
    const responseBody = await result.json();

    await prisma.user.update({
      where: {
        id: req.session.user.id,
      },
      data: {
        credentials: {
          create: {
            type: "slack_app",
            key: responseBody,
          },
        },
      },
    });
    return res.redirect("/apps/installed");
  }
}
