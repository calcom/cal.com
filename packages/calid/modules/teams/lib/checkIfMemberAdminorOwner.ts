import type { CalIdMembershipRole } from "@calcom/prisma/enums";

export function checkIfMemberAdminorOwner(
  role: CalIdMembershipRole | null | undefined
): role is "OWNER" | "ADMIN" {
  return role === "OWNER" || role === "ADMIN";
}
