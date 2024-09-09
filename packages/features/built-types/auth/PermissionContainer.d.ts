import type { FC } from "react";
import { UserPermissionRole } from "@calcom/prisma/enums";
type AdminRequiredProps = {
    as?: keyof JSX.IntrinsicElements;
    children?: React.ReactNode;
    /**Not needed right now but will be useful if we ever expand our permission roles */
    roleRequired?: UserPermissionRole;
};
export declare const PermissionContainer: FC<AdminRequiredProps>;
export {};
//# sourceMappingURL=PermissionContainer.d.ts.map