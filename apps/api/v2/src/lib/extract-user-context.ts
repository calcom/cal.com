import { Request } from "express";

import { Team } from "@calcom/prisma/client";

import { ApiAuthGuardUser } from "../modules/auth/strategies/api-auth/api-auth.strategy";

export interface UserContext {
  userId?: number;
  userEmail?: string;
  organizationId?: number;
  teamId?: number;
}

export function extractUserContext(request: Request): UserContext {
  const context: UserContext = {};

  const user = (request as any).user as ApiAuthGuardUser | undefined;
  if (user) {
    context.userId = user.id;
    context.userEmail = user.email;
  }

  const organization = (request as any).organization as { id: number } | undefined;
  if (organization) {
    context.organizationId = organization.id;
  }

  const team = (request as any).team as Team | undefined;
  if (team) {
    context.teamId = team.id;
  }

  return context;
}
