import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { defaultAvatarSrc } from "@lib/profile";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let userId;
  // Temporary auth using either token or cookie.
  const token = await getToken({ req, secret: process.env.JWT_SECRET });
  if (token && token.id) {
    userId = token.id;
  } else {
    const session = await getSession({ req: req });
    if (!session || !session.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    userId = session.user?.id;
  }

  const user: User = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      timeZone: true,
      weekStart: true,
      startTime: true,
      endTime: true,
      bufferTime: true,
      theme: true,
      createdDate: true,
      hideBranding: true,
      avatar: true,
    },
  });

  user.avatar = user.avatar || defaultAvatarSrc({ email: user.email });

  res.status(200).json({
    user,
  });
}
