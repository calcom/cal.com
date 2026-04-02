import process from "node:process";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { BuildCalendarService } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { username, password } = req.body;
    // Get user
    const user = await prisma.user.findFirstOrThrow({
      where: {
        id: req.session?.user?.id,
      },
      select: {
        email: true,
        id: true,
        credentials: {
          where: {
            type: "apple_calendar",
          },
        },
      },
    });

    let credentialExistsWithInputPassword = false;

    const credentialExistsWithUsername = user.credentials.find((credential) => {
      const decryptedCredential = JSON.parse(
        symmetricDecrypt(credential.key?.toString() || "", process.env.CALENDSO_ENCRYPTION_KEY || "")
      );

      if (decryptedCredential.username === username) {
        if (decryptedCredential.password === password) {
          credentialExistsWithInputPassword = true;
        }
        return true;
      }
    });

    if (credentialExistsWithInputPassword) return res.status(409).json({ message: "account_already_linked" });

    const data = {
      type: "apple_calendar",
      key: symmetricEncrypt(
        JSON.stringify({ username, password }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: user.id,
      teamId: null,
      appId: "apple-calendar",
      invalid: false,
    };

    try {
      const dav = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        delegationCredentialId: null,
        encryptedKey: null,
      });
      await dav?.listCalendars();
      await prisma.credential.upsert({
        where: {
          id: credentialExistsWithUsername?.id ?? -1,
        },
        create: data,
        update: data,
      });
    } catch (reason) {
      logger.error("Could not add this apple calendar account", reason);
      return res.status(500).json({ message: "unable_to_add_apple_calendar" });
    }

    return res
      .status(200)
      .json({ url: getInstalledAppPath({ variant: "calendar", slug: "apple-calendar" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/apple-calendar/setup" });
  }
}
