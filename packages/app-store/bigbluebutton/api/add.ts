import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { validateCredentials } from "../lib/bbb-api";
import { appKeysSchema } from "../zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "GET") {
    res.status(200).json({ url: "/apps/bigbluebutton/setup" });
    return;
  }

  if (!req.session?.user?.id) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  const { teamId, returnTo } = req.query;

  let teamIdNumber: number | null = null;
  if (teamId) {
    teamIdNumber = Number(teamId);
  }

  await throwIfNotHaveAdminAccessToTeam({
    teamId: teamIdNumber,
    userId: req.session.user.id,
  });

  const parseResult = appKeysSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ message: "Invalid configuration: serverUrl and sharedSecret are required." });
    return;
  }

  const { serverUrl, sharedSecret } = parseResult.data;

  try {
    // Validate BBB credentials before saving — getMeetings returns FAILED if the secret is wrong
    await validateCredentials(serverUrl, sharedSecret);
  } catch (error: unknown) {
    let msg: string;
    if (error instanceof Error) {
      msg = error.message;
    } else {
      msg = "Could not connect to BBB server";
    }
    res.status(400).json({ message: `BBB connection failed: ${msg}` });
    return;
  }

  const appType = "bigbluebutton_video";

  let installForObject: { teamId: number } | { userId: number };
  if (teamId) {
    installForObject = { teamId: Number(teamId) };
  } else {
    installForObject = { userId: req.session.user.id };
  }

  try {
    const existing = await prisma.credential.findFirst({
      select: { id: true },
      where: { type: appType, appId: "bigbluebutton", ...installForObject },
    });

    if (existing) {
      // Update credentials in-place when the app is already installed
      await prisma.credential.update({
        where: { id: existing.id },
        data: { key: { serverUrl, sharedSecret } },
      });
    } else {
      await prisma.credential.create({
        data: {
          type: appType,
          key: { serverUrl, sharedSecret },
          ...installForObject,
          appId: "bigbluebutton",
        },
      });
    }
  } catch (error: unknown) {
    const httpError = getServerErrorFromUnknown(error);
    // Log only the message to avoid leaking credential values in logs
    console.error("BigBlueButton installation error:", httpError.message);
    res.status(httpError.statusCode).json({ message: httpError.message });
    return;
  }

  let redirectUrl: string;
  if (returnTo && typeof returnTo === "string") {
    redirectUrl = returnTo;
  } else {
    redirectUrl = getInstalledAppPath({ variant: "conferencing", slug: "bigbluebutton" });
  }

  res.status(200).json({ url: redirectUrl });
}
