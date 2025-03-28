"use client";

import type { Session } from "next-auth";

import { MembershipRole } from "@calcom/prisma/enums";

export function useIsOrgAdminOrOwner(sessionData: Session | null) {
  const orgRole = sessionData?.user?.org?.role;
  return orgRole === MembershipRole.OWNER || orgRole === MembershipRole.ADMIN;
}
