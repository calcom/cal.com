import type { MembershipRole } from "@calcom/prisma/enums";

export type UserTableUser = {
  id: number;
  username: string | null;
  email: string;
  timeZone: string;
  role: MembershipRole;
  customRole: {
    id: string;
    name: string;
    teamId: number;
  } | null;
  accepted: boolean;
  disableImpersonation: boolean;
  completedOnboarding: boolean;
  lastActiveAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  avatarUrl: string | null;
  twoFactorEnabled?: boolean;
  teams: {
    id: number;
    name: string;
    slug: string | null;
  }[];
  attributes?: {
    id: string;
    value: string;
    slug: string;
    attributeId: string;
    weight: number;
    isGroup: boolean;
    contains: string[];
  }[];
};

export type PlatformManagedUserTableUser = Omit<
  UserTableUser,
  "lastActiveAt" | "attributes" | "completedOnboarding" | "disableImpersonation"
>;

export type UserTablePayload = {
  showModal: boolean;
  user?: UserTableUser;
};

export type PlatformUserTablePayload = {
  showModal: boolean;
  user?: PlatformManagedUserTableUser;
};

export type UserTableState = {
  changeMemberRole: UserTablePayload;
  deleteMember: UserTablePayload;
  impersonateMember: UserTablePayload;
  inviteMember: UserTablePayload;
  editSheet: UserTablePayload & { user?: UserTableUser };
};

export type PlatforManagedUserTableState = {
  deleteMember: UserTablePayload;
};

export type UserTableAction =
  | {
      type:
        | "SET_CHANGE_MEMBER_ROLE_ID"
        | "SET_DELETE_ID"
        | "SET_IMPERSONATE_ID"
        | "INVITE_MEMBER"
        | "EDIT_USER_SHEET"
        | "INVITE_MEMBER";
      payload: UserTablePayload;
    }
  | {
      type: "CLOSE_MODAL";
    };

export type PlatformManagedUserTableAction =
  | {
      type: "SET_DELETE_ID";
      payload: PlatformUserTablePayload;
    }
  | {
      type: "CLOSE_MODAL";
    };

export interface MemberPermissions {
  canListMembers: boolean;
  canInvite: boolean;
  canChangeMemberRole: boolean;
  canRemove: boolean;
  canImpersonate: boolean;
  canEditAttributesForUser?: boolean;
  canViewAttributes?: boolean;
}
