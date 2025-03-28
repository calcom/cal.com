import { MembershipRole } from "@calcom/prisma/enums";

export function isAdminOrOwner(role: MembershipRole | undefined) {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}
