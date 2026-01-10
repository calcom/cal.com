import type { DefaultUser } from "next-auth";

import type { User as PrismaUser, UserPermissionRole } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";

import type { UserProfile } from "./UserProfile";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `Provider` React Context
   */
  interface Session {
    hasValidLicense: boolean;
    profileId?: number | null;
    upId: string;
    user: User & { uuid: PrismaUser["uuid"] };
  }

  interface User extends Omit<DefaultUser, "id"> {
    id: PrismaUser["id"];
    uuid?: PrismaUser["uuid"];
    emailVerified?: PrismaUser["emailVerified"];
    email_verified?: boolean;
    completedOnboarding?: boolean;
    impersonatedBy?: {
      id: number;
      uuid: string;
      role: PrismaUser["role"];
    };
    belongsToActiveTeam?: boolean;
    org?: {
      id: number;
      name?: string;
      slug: string;
      logoUrl?: string | null;
      fullDomain: string;
      domainSuffix: string;
      role: MembershipRole;
    };
    username?: PrismaUser["username"];
    orgAwareUsername?: PrismaUser["username"];
    avatarUrl?: PrismaUser["avatarUrl"];
    role?: PrismaUser["role"] | "INACTIVE_ADMIN";
    locale?: string | null;
    profile?: UserProfile;
    samlTenant?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string | number;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
    upId?: string;
    profileId?: number | null;
    role?: UserPermissionRole | "INACTIVE_ADMIN" | null;
    impersonatedBy?: {
      id: number;
      uuid: string;
      role: PrismaUser["role"];
    };
    belongsToActiveTeam?: boolean;
    org?: {
      id: number;
      name?: string;
      slug: string;
      logoUrl?: string | null;
      fullDomain: string;
      domainSuffix: string;
      role: MembershipRole;
    };
    orgAwareUsername?: PrismaUser["username"];
    organizationId?: number | null;
    locale?: string;
  }
}
