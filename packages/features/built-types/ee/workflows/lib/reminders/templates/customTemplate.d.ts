import type { Dayjs } from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalEventResponses } from "@calcom/types/Calendar";
export type VariablesType = {
    eventName?: string;
    organizerName?: string;
    attendeeName?: string;
    attendeeFirstName?: string;
    attendeeLastName?: string;
    attendeeEmail?: string;
    eventDate?: Dayjs;
    eventEndTime?: Dayjs;
    timeZone?: string;
    location?: string | null;
    additionalNotes?: string | null;
    responses?: CalEventResponses | null;
    meetingUrl?: string;
    cancelLink?: string;
    rescheduleLink?: string;
    ratingUrl?: string;
    noShowUrl?: string;
};
declare const customTemplate: (text: string, variables: VariablesType, locale: string, timeFormat?: TimeFormat, isBrandingDisabled?: boolean) => {
    text: string;
    html: string;
};
export default customTemplate;
//# sourceMappingURL=customTemplate.d.ts.map