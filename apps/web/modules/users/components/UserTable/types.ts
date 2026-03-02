import type { RouterOutputs } from "@calcom/trpc/react";

export type UserTableUser = RouterOutputs["viewer"]["organizations"]["listMembers"]["rows"][number];

export type PlatformManagedUserTableUser = Omit<
  UserTableUser,
  "lastActiveAt" | "attributes" | "completedOnboarding" | "disableImpersonation"
>;

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
