import type { User as PrismaUser, UserPermissionRole } from "@prisma/client";
import type { DefaultUser } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `Provider` React Context
   */
  interface Session {
    hasValidLicense: boolean;
    user: User;
  }

  interface User extends Omit<DefaultUser, "id"> {
    id: PrismaUser["id"];
    emailVerified?: PrismaUser["emailVerified"];
    email_verified?: boolean;
    impersonatedByUID?: number;
    belongsToActiveTeam?: boolean;
    username?: PrismaUser["username"];
    role?: PrismaUser["role"] | "INACTIVE_ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string | number;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    role?: UserPermissionRole | "INACTIVE_ADMIN" | null;
    impersonatedByUID?: number | null;
    belongsToActiveTeam?: boolean;
  }
}
