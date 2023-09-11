import jwt from "jsonwebtoken";
import type { NextApiRequest } from "next";

// Import jwt module
import prisma from "@calcom/prisma";

export default async function isAuthorized(req: NextApiRequest) {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = jwt.verify(token, process.env.CALENDSO_ENCRYPTION_KEY);

  if (!decoded) return null;

  const user = await prisma.user.findFirst({
    where: {
      id: decoded.userId,
    },
    select: {
      id: true,
      username: true,
    },
  });
  return user;
}
