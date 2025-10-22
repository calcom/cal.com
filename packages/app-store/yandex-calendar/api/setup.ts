import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { CalendarServiceCredentialPayload } from "@calcom/lib/CalendarService";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import config from "../config.json";
import YandexCalendarService from "../lib/CalendarService";

type UserForSetupYandexCalendar = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

const userSelect = {
  id: true,
  email: true,
  credentials: {
    where: {
      type: "yandex_calendar",
    },
    select: {
      id: true,
      key: true,
    },
  },
};

const Body = z.object({
  username: z.string(),
  password: z.string(),
});

export const setupYandexCalendar = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = Body.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const user = await getUserForYandexCalendarSetup(userId);
    if (!user) {
      // 500 beause this should not happen, if the session has a userId, then the user should be found
      return res.status(500).json({ message: "Internal server error" });
    }

    // Check if the credentials are installed
    const foundCredentials = getExistingCredentials(user.credentials, body.data);
    if (foundCredentials === "exact_match") {
      return res.status(409).json({ message: "The account is already linked" });
    }

    const baseData = {
      type: config.type,
      userId: user.id,
      teamId: null,
      appId: config.slug,
      invalid: false,
    } satisfies Omit<Prisma.CredentialUncheckedCreateInput, "key">;

    // Validate the credentials
    const isValid = validateCredentials({
      id: -1,
      ...baseData,
      credentials: { username: body.data.username, password: body.data.password },
      delegationCredentialId: null,
      user: { email: user.email },
    });
    if (!isValid) {
      return res.status(400).json({ message: "Could not connect to Yandex Calendar" });
    }

    // Upsert the credentials
    const data = {
      ...baseData,
      key: symmetricEncrypt(
        JSON.stringify({ username: body.data.username, password: body.data.password }),
        process.env.CALENDSO_ENCRYPTION_KEY as string
      ),
    } satisfies Prisma.CredentialUncheckedCreateInput;

    await prisma.credential.upsert({
      where: {
        id: foundCredentials ? foundCredentials.id : -1,
      },
      create: data,
      update: data,
    });

    return res.status(200).json({ url: "/apps/installed/calendar?hl=yandex-calendar" });
  } catch (e) {
    logger.error("[Yandex Calendar] Error setting up Yandex Calendar", e);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 *
 * @returns false if no credentials are found, Credential if found, "exact_match" if a credential was found but it matches exactly with the provided username and password
 */
const getExistingCredentials = (
  credentials: UserForSetupYandexCalendar["credentials"],
  { username, password }: Pick<z.infer<typeof Body>, "username" | "password">
): false | UserForSetupYandexCalendar["credentials"][number] | "exact_match" => {
  for (const credential of credentials) {
    if (!credential.key) continue;

    // Decrypt the credential
    try {
      const decryptedCredential = JSON.parse(
        symmetricDecrypt(credential.key.toString(), process.env.CALENDSO_ENCRYPTION_KEY as string)
      );
      if (decryptedCredential.username === username) {
        if (decryptedCredential.password === password) {
          return "exact_match";
        }
        return credential;
      }
    } catch (error) {
      logger.error("[Yandex Calendar] Error decrypting credential", error);
      continue;
    }
  }

  return false;
};

const getUserForYandexCalendarSetup = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: userSelect,
  });
  return user;
};

const validateCredentials = async (credential: CalendarServiceCredentialPayload): Promise<boolean> => {
  try {
    const dav = new YandexCalendarService(credential);
    await dav.listCalendars();
    return true;
  } catch (error) {
    logger.error("[Yandex Calendar] Error validating credentials", error);
    return false;
  }
};
