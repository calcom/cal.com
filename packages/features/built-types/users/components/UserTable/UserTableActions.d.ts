/// <reference types="react" />
import type { Action } from "./UserListTable";
import type { User } from "./UserListTable";
export declare function TableActions({ user, permissionsForUser, dispatch, domain, }: {
    user: User;
    dispatch: React.Dispatch<Action>;
    domain: string;
    permissionsForUser: {
        canEdit: boolean;
        canRemove: boolean;
        canImpersonate: boolean;
        canResendInvitation: boolean;
    };
}): JSX.Element | null;
//# sourceMappingURL=UserTableActions.d.ts.map