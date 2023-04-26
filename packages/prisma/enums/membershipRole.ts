import type { MembershipRole } from "@prisma/client";

export const membershipRole: { [K in MembershipRole]: K } = {
  MEMBER: "MEMBER",
  ADMIN: "ADMIN",
  OWNER: "OWNER",
};

export default membershipRole;
