/// <reference types="react" />
import type { UserAdminRouterOutputs } from "../server/trpc-router";
type User = UserAdminRouterOutputs["get"]["user"];
export declare const UsersEditView: ({ user }: {
    user: User;
}) => JSX.Element;
export default UsersEditView;
//# sourceMappingURL=users-edit-view.d.ts.map