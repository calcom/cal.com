/// <reference types="react" />
import type { MembershipRole } from "@calcom/prisma/enums";
export interface User {
    id: number;
    username: string | null;
    email: string;
    timeZone: string;
    role: MembershipRole;
    avatarUrl: string | null;
    accepted: boolean;
    disableImpersonation: boolean;
    completedOnboarding: boolean;
    teams: {
        id: number;
        name: string;
        slug: string | null;
    }[];
}
type Payload = {
    showModal: boolean;
    user?: User;
};
export type State = {
    changeMemberRole: Payload;
    deleteMember: Payload;
    impersonateMember: Payload;
    inviteMember: Payload;
    editSheet: Payload & {
        user?: User;
    };
};
export type Action = {
    type: "SET_CHANGE_MEMBER_ROLE_ID" | "SET_DELETE_ID" | "SET_IMPERSONATE_ID" | "INVITE_MEMBER" | "EDIT_USER_SHEET";
    payload: Payload;
} | {
    type: "CLOSE_MODAL";
};
export declare function UserListTable(): JSX.Element;
export {};
//# sourceMappingURL=UserListTable.d.ts.map