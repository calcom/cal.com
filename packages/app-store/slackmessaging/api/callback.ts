import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let client_id = "";
let client_secret = "";

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

    const appKeys = await getAppKeysFromSlug("slack");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (typeof appKeys.client_secret === "string") client_secret = appKeys.client_secret;
    if (!client_id) return res.status(400).json({ message: "Slack client_id missing" });
    if (!client_secret) return res.status(400).json({ message: "Slack client_secret missing" });

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
