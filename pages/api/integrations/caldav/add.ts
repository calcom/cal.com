import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import prisma from "../../../../lib/prisma";
import { symmetricEncrypt } from "@lib/crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Check that user is authenticated
    const session = await getSession({ req: req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const { username, password, url } = req.body;
    // Get user
    const user = await prisma.user.findFirst({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
      },
    });

    await prisma.credential.create({
      data: {
        type: "caldav_calendar",
        key: symmetricEncrypt(
          JSON.stringify({ username, password, url }),
          process.env.CALENDSO_ENCRYPTION_KEY
        ),
        userId: session.user.id,
      },
    });

    res.status(200).json({});
  }
}
