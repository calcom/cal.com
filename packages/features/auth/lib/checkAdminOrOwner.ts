import { MembershipRole } from "@calcom/prisma/enums";

export function checkAdminOrOwner(role: MembershipRole | undefined) {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}
