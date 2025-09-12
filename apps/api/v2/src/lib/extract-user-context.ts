import { Request } from "express";

import type { Team } from "@calcom/prisma/client";

import { ApiAuthGuardUser } from "../modules/auth/strategies/api-auth/api-auth.strategy";

export interface UserContext {
  userId?: string;
  userEmail?: string;
  organizationId?: string;
  teamId?: string;
  userOrgId?: string;
}

export function extractUserContext(request: Request): UserContext {
  const context: UserContext = {};

  const user = (request as any).user as ApiAuthGuardUser | undefined;
  if (user) {
    context.userId = String(user.id);
    context.userEmail = user.email;
    if (user.profiles?.[0]?.organizationId) {
      context.userOrgId = String(user.profiles?.[0].organizationId);
    }
  }

  const organizationId = (request as any).organizationId as number | undefined;
  if (organizationId) {
    context.organizationId = String(organizationId);
  }

  const team = (request as any).team as Team | undefined;
  if (team) {
    context.teamId = String(team.id);
  }

  return context;
}
