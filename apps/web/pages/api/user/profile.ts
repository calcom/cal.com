import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { pick } from "lodash";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import { resizeBase64Image } from "@server/lib/resizeBase64Image";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  try {
    const avatar = req.body.avatar ? await resizeBase64Image(req.body.avatar) : undefined;
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        ...pick(req.body, [
          "username",
          "name",
          "timeZone",
          "weekStart",
          "hideBranding",
          "theme",
          "completedOnboarding",
          "locale",
        ]),
        avatar,
        bio: req.body.description,
      },
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return res.status(409).json({ message: "Username already taken" });
      }
    }
    throw e;
  }

  return res.status(200).json({ message: "Profile updated successfully" });
}
