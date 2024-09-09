import type { Dayjs } from "@calcom/dayjs";
type EventDetails = {
    username: string;
    eventSlug: string;
    startTime: Dayjs;
    visitorTimezone?: string;
    visitorUid?: string;
};
export declare const handleNotificationWhenNoSlots: ({ eventDetails, orgDetails, }: {
    eventDetails: EventDetails;
    orgDetails: {
        currentOrgDomain: string | null;
    };
}) => Promise<void>;
export {};
