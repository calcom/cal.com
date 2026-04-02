import process from "node:process";
import prisma from "@calcom/prisma";
import type { OAuthTokenPayload } from "@calcom/types/oauth";
import jwt from "jsonwebtoken";

export default async function isAuthorized(token: string, requiredScopes: string[] = []) {
  let decodedToken: OAuthTokenPayload;
  try {
    decodedToken = jwt.verify(token, process.env.CALENDSO_ENCRYPTION_KEY || "") as OAuthTokenPayload;
  } catch {
    return null;
  }

  if (!decodedToken) return null;
  const hasAllRequiredScopes = requiredScopes.every((scope) => decodedToken.scope.includes(scope));

  if (!hasAllRequiredScopes || decodedToken.token_type !== "Access Token") {
    return null;
  }

  if (decodedToken.userId) {
    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.userId,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) return null;

    return { id: user.id, name: user.username, isTeam: false };
  }

  if (decodedToken.teamId) {
    const team = await prisma.team.findUnique({
      where: {
        id: decodedToken.teamId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!team) return null;
    return { ...team, isTeam: true };
  }

  return null;
}
