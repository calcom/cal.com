/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
interface Props {
    member: RouterOutputs["viewer"]["organizations"]["listOtherTeamMembers"]["rows"][number];
}
export default function MemberListItem(props: Props): JSX.Element;
export {};
//# sourceMappingURL=MemberListItem.d.ts.map