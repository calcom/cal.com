import { MembershipRole } from "@calcom/prisma/enums";

export function checkAdminOrOwner(role: MembershipRole | null | undefined): role is "OWNER" | "ADMIN" {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}
