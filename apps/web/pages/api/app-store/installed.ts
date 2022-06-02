import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  req.session = await getSession({ req });
  if (req.method === "GET" && req.session && req.session.user.id && req.query) {
    const { "app-slug": appSlug } = req.query;

    if (!appSlug && Array.isArray(appSlug)) {
      return res.status(400);
    }

    const userId = req.session.user.id;
    let where;
    if (appSlug === "giphy") {
      where = {
        userId: userId,
        type: "giphy_other",
      };
    } else if (appSlug === "slack") {
      where = {
        userId: userId,
        type: "slack_app",
      };
    } else {
      where = {
        userId: userId,
        appId: appSlug,
      };
    }
    try {
      const installedApp = await prisma.credential.findFirst({
        where,
      });

      if (installedApp && !!installedApp.key) {
        res.status(200);
      } else {
        res.status(404);
      }
    } catch (error) {
      console.log(error);
      res.status(500);
    }
  } else {
    res.status(400);
  }
  res.end();
}
