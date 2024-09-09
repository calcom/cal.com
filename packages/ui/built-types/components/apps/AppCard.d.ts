/// <reference types="react" />
import type { UserAdminTeams } from "@calcom/lib/server/repository/user";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";
interface AppCardProps {
    app: App;
    credentials?: Credential[];
    searchText?: string;
    userAdminTeams?: UserAdminTeams;
}
export declare function AppCard({ app, credentials, searchText, userAdminTeams }: AppCardProps): JSX.Element;
export {};
//# sourceMappingURL=AppCard.d.ts.map