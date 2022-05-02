import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let client_id = "";
const scopes = ["commands", "users:read", "users:read.email", "chat:write", "chat:write.public"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  if (req.method === "GET") {
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "You must be logged in to do this" });
    }

    const appKeys = await getAppKeysFromSlug("slack");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (!client_id) return res.status(400).json({ message: "Slack client_id missing" });
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
    return res.status(200).json({ url });
  }
  return res.status(404).json({ error: "Not Found" });
}
