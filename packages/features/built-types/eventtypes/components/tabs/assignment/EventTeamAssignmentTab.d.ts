/// <reference types="react" />
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
export declare const mapMemberToChildrenOption: (member: EventTypeSetupProps["teamMembers"][number], slug: string, pendingString: string) => {
    slug: string;
    hidden: boolean;
    created: boolean;
    owner: {
        id: number;
        name: string;
        email: string;
        username: string;
        membership: import(".prisma/client").$Enums.MembershipRole;
        eventTypeSlugs: string[];
        avatar: string;
        profile: import("@calcom/types/UserProfile").UserProfile;
    };
    value: string;
    label: string;
};
export declare const EventTeamAssignmentTab: ({ team, teamMembers, eventType, }: Pick<EventTypeSetupProps, "teamMembers" | "team" | "eventType">) => JSX.Element;
//# sourceMappingURL=EventTeamAssignmentTab.d.ts.map