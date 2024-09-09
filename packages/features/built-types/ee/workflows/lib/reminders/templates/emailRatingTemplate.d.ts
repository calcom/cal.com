import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";
declare const emailRatingTemplate: ({ isEditingMode, action, timeFormat, startTime, endTime, eventName, timeZone, organizer, name, isBrandingDisabled, ratingUrl, noShowUrl, }: {
    isEditingMode: boolean;
    action: WorkflowActions;
    timeFormat?: TimeFormat | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    eventName?: string | undefined;
    timeZone?: string | undefined;
    organizer?: string | undefined;
    name?: string | undefined;
    isBrandingDisabled?: boolean | undefined;
    ratingUrl?: string | undefined;
    noShowUrl?: string | undefined;
}) => {
    emailSubject: string;
    emailBody: string;
};
export default emailRatingTemplate;
//# sourceMappingURL=emailRatingTemplate.d.ts.map