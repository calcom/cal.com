/// <reference types="react" />
import { MembershipRole } from "@calcom/prisma/enums";
export default function MemberChangeRoleModal(props: {
    isOpen: boolean;
    currentMember: MembershipRole;
    memberId: number;
    teamId: number;
    initialRole: MembershipRole;
    onExit: () => void;
    searchTerm?: string;
}): JSX.Element;
//# sourceMappingURL=MemberChangeRoleModal.d.ts.map