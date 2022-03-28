import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import prisma from "@calcom/prisma";

const client_id = process.env.SLACK_CLIENT_ID;
const scopes = ["commands", "users:read", "users:read.email"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  if (req.method === "GET") {
    // Get user
    await prisma.user.findFirst({
      rejectOnNotFound: true,
      where: {
        id: req.session.user.id,
      },
      select: {
        id: true,
      },
    });
    const params = {
      client_id,
      scope: scopes.join(","),
    };
    const query = stringify(params);
    const url = `https://slack.com/oauth/v2/authorize?${query}&user_`;
    // const url =
    //   "https://slack.com/oauth/v2/authorize?client_id=3194129032064.3178385871204&scope=chat:write,commands&user_scope=";
    res.status(200).json({ url });
  }
  res.status(404).json({ error: "Not Found" });
}
