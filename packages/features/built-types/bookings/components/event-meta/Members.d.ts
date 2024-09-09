/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
export interface EventMembersProps {
    /**
     * Used to determine whether all members should be shown or not.
     * In case of Round Robin type, members aren't shown.
     */
    schedulingType: BookerEvent["schedulingType"];
    users: BookerEvent["users"];
    profile: BookerEvent["profile"];
    entity: BookerEvent["entity"];
}
export declare const EventMembers: ({ schedulingType, users, profile, entity }: EventMembersProps) => JSX.Element;
//# sourceMappingURL=Members.d.ts.map