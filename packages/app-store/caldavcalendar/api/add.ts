import process from "node:process";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { BuildCalendarService } from "../lib";

type CalDavCredentialIdentity = {
  username: string;
  password: string;
  url: string;
};

const getEncryptionKey = (): string => process.env.CALENDSO_ENCRYPTION_KEY || "";

const getCalDavIdentityFromCredentialKey = (credentialKey: unknown): CalDavCredentialIdentity | null => {
  if (typeof credentialKey !== "string") {
    return null;
  }

  try {
    const decrypted = JSON.parse(symmetricDecrypt(credentialKey, getEncryptionKey()));

    if (
      typeof decrypted?.username !== "string" ||
      typeof decrypted?.password !== "string" ||
      typeof decrypted?.url !== "string"
    ) {
      return null;
    }

    return {
      username: decrypted.username,
      password: decrypted.password,
      url: decrypted.url,
    };
  } catch {
    return null;
  }
};

const hasMatchingCalDavIdentity = (
  existingCredentialKeys: unknown[],
  newCredentialIdentity: CalDavCredentialIdentity
): boolean => {
  return existingCredentialKeys.some((credentialKey) => {
    const existingIdentity = getCalDavIdentityFromCredentialKey(credentialKey);

    if (!existingIdentity) {
      return false;
    }

    return (
      existingIdentity.url === newCredentialIdentity.url &&
      existingIdentity.username === newCredentialIdentity.username &&
      existingIdentity.password === newCredentialIdentity.password
    );
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<undefined | NextApiResponse> {
  if (req.method === "POST") {
    const { username, password, url } = req.body;
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

    const existingCredentials = await prisma.credential.findMany({
      where: {
        userId: user.id,
        appId: "caldav-calendar",
        type: "caldav_calendar",
      },
      select: {
        key: true,
      },
    });

    const duplicateIdentityExists = hasMatchingCalDavIdentity(
      existingCredentials.map((credential) => credential.key),
      {
        username,
        password,
        url,
      }
    );

    if (duplicateIdentityExists) {
      return res
        .status(200)
        .json({ url: getInstalledAppPath({ variant: "calendar", slug: "caldav-calendar" }) });
    }

    const data = {
      type: "caldav_calendar",
      key: symmetricEncrypt(JSON.stringify({ username, password, url }), getEncryptionKey()),
      userId: user.id,
      teamId: null,
      appId: "caldav-calendar",
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
      await prisma.credential.create({
        data,
      });
    } catch (e) {
      logger.error("Could not add this caldav account", e);
      if (e instanceof Error) {
        let message = e.message;
        if (e.message.indexOf("Invalid credentials") > -1 && url.indexOf("dav.php") > -1) {
          const parsedUrl = new URL(url);
          const parsedPort = parsedUrl.port;
          let adminUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

          if (parsedPort) {
            adminUrl = `${adminUrl}:${parsedPort}`;
          }

          adminUrl = `${adminUrl}/admin/?/settings/standard/`;
          message = `Couldn't connect to caldav account, please verify WebDAV authentication type is set to "Basic"`;
          return res.status(500).json({ message, actionUrl: adminUrl });
        }
      }
      return res.status(500).json({ message: "Could not add this caldav account" });
    }

    return res
      .status(200)
      .json({ url: getInstalledAppPath({ variant: "calendar", slug: "caldav-calendar" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/caldav-calendar/setup" });
  }
}
