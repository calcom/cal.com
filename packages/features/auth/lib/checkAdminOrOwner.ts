import type { MembershipRole } from "@calcom/prisma/enums";

export function checkAdminOrOwner(role: MembershipRole | undefined): role is "OWNER" | "ADMIN" {
  return role === "OWNER" || role === "ADMIN";
}
