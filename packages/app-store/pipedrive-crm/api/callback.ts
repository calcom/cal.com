import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { getOAuthClientFromSession, pipedriveAppKeysSchema } from "../lib/util";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  // Check that user is authenticated
  req.session = await getServerSession({ req, res });
  const code = req.query.code as string;
  if (!req.session || !code) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!code) {
    return res.status(400).json({ message: "Auth code missing" });
  }

  const { client } = await getOAuthClientFromSession(req.session);
  const tokens = await client.authorize(code);

  // Update credential with new oauth tokens field
  const credentials = await prisma.credential.findFirst({
    where: {
      userId: req.session?.user.id,
      type: appConfig.type,
    },
  });

  if (!credentials) {
    return res.status(400).json({ message: "Credentials not created - Application is not installed." });
  }

  const credKeys = pipedriveAppKeysSchema.parse(credentials.key);

  await prisma.credential.update({
    where: {
      id: credentials.id,
    },
    data: {
      key: {
        ...credKeys,
        tokens,
        lastUpdated: new Date(),
      },
    },
  });

  res.redirect(getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug }));
}
