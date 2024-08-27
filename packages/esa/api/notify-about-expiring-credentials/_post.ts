/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

import dayjs from "@calcom/dayjs";
import { defaultResponder } from "@calcom/lib/server";

const getCredentialExpiry = (credential: { id: number; type: string; key: any }) => {
  // get expiry date somehow for credential and renewal url
  console.log(credential.type);

  return {
    expiresAt: dayjs().add(4, "weeks").unix(),
    renewalUrl: ``,
  };
};

async function postHandler(req: NextApiRequest) {
  const $req = req as NextApiRequest & { prisma: any };
  const prisma: PrismaClient = $req.prisma;

  const credentialExpiryNotifications = await prisma.credentialExpiryNotification.findMany();
  const credentials = await prisma.credential.findMany();

  console.log(`processing ${credentials.length} credentials`);

  for (const credential of credentials) {
    const { expiresAt, renewalUrl } = getCredentialExpiry(credential);

    if (!expiresAt) {
      continue;
    }
    const notification = credentialExpiryNotifications.find(
      (notification) => notification.credentialId === credential.id
    );
    const lastNotifiedAt = notification?.lastNotifiedAt; // unix timestamp in seconds
    const weeksLeftToExpiry = dayjs.unix(expiresAt).diff(dayjs(), "weeks", true);

    let shouldNotify = false;
    let isUrgent = false;

    const daysSinceLastNotify = dayjs()
      .startOf("day")
      .diff(dayjs.unix(Number(lastNotifiedAt || 0)));

    if (weeksLeftToExpiry <= 4 && weeksLeftToExpiry > 1) {
      shouldNotify = daysSinceLastNotify >= 7;
    }

    if (weeksLeftToExpiry <= 1) {
      shouldNotify = daysSinceLastNotify >= 1;
      isUrgent = shouldNotify;
    }

    if (shouldNotify && credential.userId) {
      const user = await prisma.user.findUnique({
        where: {
          id: credential.userId,
        },
      });

      if (user) {
        console.log("sending email for credential renewal reminder", {
          user: user.email,
          credential,
          isUrgent,
          renewalUrl,
        });
      }
    }
  }

  console.log(`dene processing ${credentials.length} credentials`);

  return {
    message: "In progress",
  };
}

export default defaultResponder(postHandler);
