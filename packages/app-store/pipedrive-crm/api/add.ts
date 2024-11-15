import type { NextApiRequest, NextApiResponse } from "next";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  // Check that user is authenticated
  req.session = await getServerSession({ req, res });
  const { teamId } = req.query;
  const user = req.session?.user;
  if (user === undefined) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  await throwIfNotHaveAdminAccessToTeam({ teamId: Number(teamId) ?? null, userId: user.id });

  try {
    const appType = appConfig.type;
    const installForObject = teamId ? { teamId: Number(teamId) } : { userId: user.id };
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...installForObject,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await createDefaultInstallation({
      appType: appType,
      user,
      slug: appConfig.slug,
      key: {},
      teamId: Number(teamId),
    });

    if (!installation) {
      throw new Error("Unable to create user credential for PipeDrive CRM");
    }
  } catch (error: unknown) {
    return res.status(500).json({ error });
  }

  res.redirect(`/apps/pipedrive-crm/setup`);
}
