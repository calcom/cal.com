import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }
  // TODO: Define appType once and import everywhere
  const slug = appConfig.slug;
  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        appId: slug,
        userId: req.session.user.id,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await prisma.credential.create({
      data: {
        // TODO: Why do we need type in Credential? Why can't we simply use appId
        type: slug,
        key: {},
        userId: req.session.user.id,
        appId: slug,
      },
    });
    if (!installation) {
      throw new Error(`Unable to create user credential for ${slug}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  return res.status(200).json({ url: "/apps/zapier/setup" });
}
