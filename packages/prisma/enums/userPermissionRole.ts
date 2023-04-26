import type { UserPermissionRole } from "@prisma/client";

export const userPermissionRole: { [K in UserPermissionRole]: K } = {
  USER: "USER",
  ADMIN: "ADMIN",
};

export default userPermissionRole;
