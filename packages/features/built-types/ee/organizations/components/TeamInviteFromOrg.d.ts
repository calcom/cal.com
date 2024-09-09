import type { PropsWithChildren } from "react";
import type { RouterOutputs } from "@calcom/trpc";
type TeamInviteFromOrgProps = PropsWithChildren<{
    selectedEmails?: string | string[];
    handleOnChecked: (usersEmail: string) => void;
    orgMembers?: RouterOutputs["viewer"]["organizations"]["getMembers"];
}>;
export default function TeamInviteFromOrg({ handleOnChecked, selectedEmails, orgMembers, }: TeamInviteFromOrgProps): JSX.Element;
export {};
//# sourceMappingURL=TeamInviteFromOrg.d.ts.map