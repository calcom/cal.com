"use client";

import { useSession } from "next-auth/react";

import { MembershipRole } from "@calcom/prisma/enums";

export function useIsOrgAdminOrOwner() {
  const session = useSession();
  const orgRole = session?.data?.user?.org?.role;
  return orgRole === MembershipRole.OWNER || orgRole === MembershipRole.ADMIN;
}
