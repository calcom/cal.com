import process from "node:process";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import BuildCalendarService from "../lib/CalendarService";
import { isProtonCalendarUrl } from "../lib/isProtonCalendarUrl";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "GET") {
    res.status(200).json({ url: "/apps/proton-calendar/setup" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const userId = req.session?.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  let rawUrl = "";

  if (typeof req.body?.url === "string") {
    rawUrl = req.body.url.trim();
  }

  if (!isProtonCalendarUrl(rawUrl)) {
    res.status(400).json({ message: "Please enter a valid Proton Calendar share link" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const data = {
      type: appConfig.type,
      key: symmetricEncrypt(JSON.stringify({ urls: [rawUrl] }), process.env.CALENDSO_ENCRYPTION_KEY || ""),
      userId: user.id,
      teamId: null,
      appId: appConfig.slug,
      invalid: false,
      delegationCredentialId: null,
    };

    const calendar = BuildCalendarService({
      id: 0,
      ...data,
      user: { email: user.email },
      encryptedKey: null,
    });
    const listedCalendars = await calendar.listCalendars();

    if (listedCalendars.length !== 1) {
      throw new Error("Could not read Proton Calendar feed");
    }

    await prisma.credential.create({
      data,
    });
  } catch (error) {
    logger.error("Could not add Proton Calendar feed", error);
    res.status(500).json({ message: "Could not add Proton Calendar feed" });
    return;
  }

  res.status(200).json({ url: getInstalledAppPath({ variant: "calendar", slug: appConfig.slug }) });
}
