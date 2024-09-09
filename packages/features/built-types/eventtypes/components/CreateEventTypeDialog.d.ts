/// <reference types="react" />
import { MembershipRole } from "@calcom/prisma/enums";
export interface EventTypeParent {
    teamId: number | null | undefined;
    membershipRole?: MembershipRole | null;
    name?: string | null;
    slug?: string | null;
    image?: string | null;
}
export default function CreateEventTypeDialog({ profileOptions, isInfiniteScrollEnabled, }: {
    profileOptions: {
        teamId: number | null | undefined;
        label: string | null;
        image: string | undefined;
        membershipRole: MembershipRole | null | undefined;
    }[];
    isInfiniteScrollEnabled: boolean;
}): JSX.Element;
//# sourceMappingURL=CreateEventTypeDialog.d.ts.map