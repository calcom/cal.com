import type { CalIdMembershipRole } from "@calcom/prisma/enums";

export function checkIfMemberAdminOrOwner(
  role: CalIdMembershipRole | null | undefined
): role is "OWNER" | "ADMIN" {
  return role === "OWNER" || role === "ADMIN";
}
