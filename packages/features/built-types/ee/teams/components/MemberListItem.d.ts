/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
import type { ConnectedAppsType } from "../pages/team-members-view";
interface Props {
    team: NonNullable<RouterOutputs["viewer"]["teams"]["getMinimal"]>;
    member: RouterOutputs["viewer"]["teams"]["lazyLoadMembers"]["members"][number];
    isOrgAdminOrOwner: boolean | undefined;
    searchTerm: string;
    connectedApps: ConnectedAppsType[];
}
export default function MemberListItem(props: Props): JSX.Element;
export {};
//# sourceMappingURL=MemberListItem.d.ts.map