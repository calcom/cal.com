import { InstallProvider } from "@slack/oauth";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { BASE_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const client_id = process.env.SLACK_CLIENT_ID;
const client_secret = process.env.SLACK_CLIENT_SECRET;
const scopes = ["commands"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Get user
    await prisma.user.findFirst({
      rejectOnNotFound: true,
      where: {
        id: req.session?.user?.id,
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
