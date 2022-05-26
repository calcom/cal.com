import { UserPermissionRole } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  type DefaultSessionUser = NonNullable<DefaultSession["user"]>;
  type CalendsoSessionUser = DefaultSessionUser & {
    id: number;
    username: string;
    impersonatedByUID?: number;
    role: UserPermissionRole;
  };
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `Provider` React Context
   */
  interface Session {
    hasValidLicense: boolean;
    user: CalendsoSessionUser;
  }
}
