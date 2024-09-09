/// <reference types="react" />
import type { MembershipRole } from "@calcom/prisma/enums";
interface Props {
    teams: {
        id?: number;
        name?: string | null;
        slug?: string | null;
        bio?: string | null;
        hideBranding?: boolean | undefined;
        role: MembershipRole;
        logoUrl?: string | null;
        accepted: boolean;
    }[];
}
export default function TeamInviteList(props: Props): JSX.Element;
export {};
//# sourceMappingURL=TeamInviteList.d.ts.map