import type { UIEvent } from "react";
import type { UserAdminTeams } from "@calcom/lib/server/repository/user";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";
export declare function useShouldShowArrows(): {
    ref: import("react").RefObject<HTMLUListElement>;
    calculateScroll: (e: UIEvent<HTMLUListElement>) => void;
    leftVisible: boolean;
    rightVisible: boolean;
};
type AllAppsPropsType = {
    apps: (App & {
        credentials?: Credential[];
    })[];
    searchText?: string;
    categories: string[];
    userAdminTeams?: UserAdminTeams;
};
export declare function AllApps({ apps, searchText, categories, userAdminTeams }: AllAppsPropsType): JSX.Element;
export {};
//# sourceMappingURL=AllApps.d.ts.map