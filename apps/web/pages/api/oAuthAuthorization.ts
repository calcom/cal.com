import jwt from "jsonwebtoken";
import type { NextApiRequest } from "next";

import prisma from "@calcom/prisma";

export default async function isAuthorized(req: NextApiRequest, requiredScopes: string[] = []) {
  const token = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(token, process.env.CALENDSO_ENCRYPTION_KEY);

  const hasAllRequiredScopes = requiredScopes.every((scope) => decodedToken.scope.includes(scope));

  if (!hasAllRequiredScopes) {
    throw new Error("Invalid Scopes");
  }

  if (decodedToken.token_type !== "Access Token") {
    throw new Error("Invalid token type");
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

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
