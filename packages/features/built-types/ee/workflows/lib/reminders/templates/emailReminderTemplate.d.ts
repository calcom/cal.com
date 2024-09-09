import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";
declare const emailReminderTemplate: (isEditingMode: boolean, action?: WorkflowActions, timeFormat?: TimeFormat, startTime?: string, endTime?: string, eventName?: string, timeZone?: string, otherPerson?: string, name?: string, isBrandingDisabled?: boolean) => {
    emailSubject: string;
    emailBody: string;
};
export default emailReminderTemplate;
//# sourceMappingURL=emailReminderTemplate.d.ts.map