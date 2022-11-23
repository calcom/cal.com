import { UserPermissionRole } from "@prisma/client";
import { DefaultUser } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `Provider` React Context
   */
  interface Session {
    hasValidLicense: boolean;
    user: User & {
      role: UserPermissionRole;
      impersonatedByUID?: number;
    };
  }
  interface User extends Omit<DefaultUser, "id"> {
    id: number;
    username?: string;
  }
}
