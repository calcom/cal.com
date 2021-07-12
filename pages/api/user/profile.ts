import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import prisma, { whereAndSelect } from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // Get user
  const user = await whereAndSelect(
    prisma.user.findUnique,
    {
      id: session.user.id,
    },
    ["id", "password"]
  );

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const username = req.body.username;
  // username is changed: username is optional but it is necessary to be unique, enforce here
  if (username !== session.user.username) {
    const userConflict = await prisma.user.findFirst({
      where: {
        username,
      },
    });
    if (userConflict) {
      return res.status(409).json({ message: "Username already taken" });
    }
  }

  const name = req.body.name;
  const description = req.body.description;
  const avatar = req.body.avatar;
  const timeZone = req.body.timeZone;
  const weekStart = req.body.weekStart;
  const hideBranding = req.body.hideBranding;
  const theme = req.body.theme;

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      username,
      name,
      avatar,
      bio: description,
      timeZone,
      weekStart,
      hideBranding,
      theme,
    },
  });

  return res.status(200).json({ message: "Profile updated successfully" });
}
