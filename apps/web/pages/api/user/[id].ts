import { pick } from "lodash";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session?.user.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const userIdQuery = req.query?.id ?? null;
  const userId = Array.isArray(userIdQuery) ? parseInt(userIdQuery.pop() || "") : parseInt(userIdQuery);

  const authenticatedUser = await prisma.user.findFirst({
    rejectOnNotFound: true,
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (userId !== authenticatedUser.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.method === "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (req.method === "PATCH") {
    const updatedUser = await prisma.user.update({
      where: {
        id: authenticatedUser.id,
      },
      data: {
        ...pick(req.body.data, [
          "username",
          "name",
          "avatar",
          "timeZone",
          "weekStart",
          "hideBranding",
          "theme",
          "completedOnboarding",
        ]),
        bio: req.body.description ?? req.body.data?.bio,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        emailVerified: true,
        bio: true,
        avatar: true,
        timeZone: true,
        weekStart: true,
        startTime: true,
        endTime: true,
        bufferTime: true,
        hideBranding: true,
        theme: true,
        createdDate: true,
        plan: true,
        completedOnboarding: true,
      },
    });
    return res.status(200).json({ message: "User Updated", data: updatedUser });
  }
}
