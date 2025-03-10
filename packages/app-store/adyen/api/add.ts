import type { NextApiRequest, NextApiResponse } from "next";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import prisma from "@calcom/prisma";

import config from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const appKeys = await getAppKeysFromSlug(config.slug);
  const clientId = typeof appKeys.client_id === "string" ? appKeys.client_id : "";
  const clientSecret = typeof appKeys.client_secret === "string" ? appKeys.client_secret : "";
  if (!clientId && !clientSecret)
    return res.status(400).json({ message: "Adyen app client_id and client_secret are missing." });
  if (!clientId) return res.status(400).json({ message: "Adyen app client_id missing." });
  if (!clientSecret) return res.status(400).json({ message: "Adyen app client_secret missing." });

  const { teamId } = req.query;
  await throwIfNotHaveAdminAccessToTeam({ teamId: Number(teamId) ?? null, userId: req.session.user.id });
  const installForObject = teamId ? { teamId: Number(teamId) } : { userId: req.session.user.id };

  const appType = config.type;
  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...installForObject,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        ...installForObject,
        appId: "adyen",
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for Adyen");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }

  return res.status(200).json({ url: "/apps/adyen/setup" });
}
