/// <reference types="react" />
import type { MembershipRole } from "@calcom/prisma/enums";
interface Props {
    team: {
        id?: number;
        name?: string | null;
        slug?: string | null;
        bio?: string | null;
        logoUrl?: string | null;
        hideBranding?: boolean | undefined;
        role: MembershipRole;
        accepted: boolean;
    };
    key: number;
    onActionSelect: (text: string) => void;
    isPending?: boolean;
    hideDropdown: boolean;
    setHideDropdown: (value: boolean) => void;
}
export default function TeamInviteListItem(props: Props): JSX.Element;
export {};
//# sourceMappingURL=TeamInviteListItem.d.ts.map