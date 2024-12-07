import type { MembershipRole } from "@calcom/prisma/enums";

export interface UserTableUser {
  id: number;
  username: string | null;
  email: string;
  timeZone: string;
  role: MembershipRole;
  avatarUrl: string | null;
  accepted: boolean;
  disableImpersonation: boolean;
  completedOnboarding: boolean;
  lastActiveAt: string;
  teams: {
    id: number;
    name: string;
    slug: string | null;
  }[];
  attributes: {
    id: string;
    attributeId: string;
    value: string;
    slug: string;
    contains: string[];
  }[];
}

export type UserTablePayload = {
  showModal: boolean;
  user?: UserTableUser;
};

export type UserTableState = {
  changeMemberRole: UserTablePayload;
  deleteMember: UserTablePayload;
  impersonateMember: UserTablePayload;
  inviteMember: UserTablePayload;
  editSheet: UserTablePayload & { user?: UserTableUser };
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
