import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { CalendarService } from "../lib";

const bodySchema = z
  .object({
    username: z.string(),
    password: z.string(),
    url: z.string().url(),
  })
  .strict();

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const body = bodySchema.parse(req.body);
  // Get user
  const user = await prisma.user.findFirstOrThrow({
    where: {
      id: req.session?.user?.id,
    },
    select: {
      id: true,
      email: true,
    },
  });

  const data = {
    type: "exchange2016_calendar",
    key: symmetricEncrypt(JSON.stringify(body), process.env.CALENDSO_ENCRYPTION_KEY || ""),
    userId: user.id,
    teamId: null,
    appId: "exchange2016-calendar",
    invalid: false,
  };

  try {
    const dav = new CalendarService({
      id: 0,
      user: { email: user.email },
      ...data,
    });
    await dav?.listCalendars();
    await prisma.credential.create({
      data,
    });
  } catch (reason) {
    logger.error("Could not add this exchange account", reason);
    return res.status(500).json({ message: "Could not add this exchange account" });
  }

  return { url: getInstalledAppPath({ variant: "calendar", slug: "exchange2016-calendar" }) };
}

async function getHandler() {
  return { url: "/apps/exchange2016-calendar/setup" };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
