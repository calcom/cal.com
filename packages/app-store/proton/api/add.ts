import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { BuildCalendarService } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { username, password, url = "https://caldav.proton.me" } = req.body;
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
            type: "proton_calendar",
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
      type: "proton_calendar",
      key: symmetricEncrypt(
        JSON.stringify({ username, password, url }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: user.id,
      teamId: null,
      appId: "proton-calendar",
      invalid: false,
      delegationCredentialId: null,
    };

    try {
      const dav = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
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
      logger.error("Could not add this proton calendar account", reason);
      return res.status(500).json({ message: "unable_to_add_proton_calendar" });
    }

    return res
      .status(200)
      .json({ url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }
}
