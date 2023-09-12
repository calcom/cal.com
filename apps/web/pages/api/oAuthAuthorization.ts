import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function isAuthorized(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredScopes: string[] = []
) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.CALENDSO_ENCRYPTION_KEY);

    const hasAllRequiredScopes = requiredScopes.every((scope) => decodedToken.scope.includes(scope));

    if (!hasAllRequiredScopes) {
      return res.status(400).json({ message: "Invalid Scopes" });
    }

    if (decodedToken.tokenType !== "Access Token") {
      return res.status(400).json({ message: "Invalid token type" });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: decodedToken.userId,
      },
      select: {
        id: true,
        username: true,
      },
    });
    return user;
  } catch {
    return res.status(401).json({ message: "Not authenticated" });
  }
}
