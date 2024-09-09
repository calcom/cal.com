import type { Dispatch } from "react";
import { type RouterOutputs } from "@calcom/trpc/react";
import type { Action } from "../UserListTable";
export declare function EditForm({ selectedUser, avatarUrl, domainUrl, dispatch, }: {
    selectedUser: RouterOutputs["viewer"]["organizations"]["getUser"];
    avatarUrl: string;
    domainUrl: string;
    dispatch: Dispatch<Action>;
}): JSX.Element;
//# sourceMappingURL=EditUserForm.d.ts.map