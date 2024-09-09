import type { MailData } from "@sendgrid/helpers/classes/mail";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WorkflowActions, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { BookingInfo } from "./smsReminderManager";
type ScheduleEmailReminderAction = Extract<WorkflowActions, "EMAIL_HOST" | "EMAIL_ATTENDEE" | "EMAIL_ADDRESS">;
export interface ScheduleReminderArgs {
    evt: BookingInfo;
    triggerEvent: WorkflowTriggerEvents;
    timeSpan: {
        time: number | null;
        timeUnit: TimeUnit | null;
    };
    template?: WorkflowTemplates;
    sender?: string | null;
    workflowStepId?: number;
    seatReferenceUid?: string;
}
interface scheduleEmailReminderArgs extends ScheduleReminderArgs {
    sendTo: MailData["to"];
    action: ScheduleEmailReminderAction;
    emailSubject?: string;
    emailBody?: string;
    hideBranding?: boolean;
    includeCalendarEvent?: boolean;
    isMandatoryReminder?: boolean;
}
export declare const scheduleEmailReminder: (args: scheduleEmailReminderArgs) => Promise<void>;
export declare const deleteScheduledEmailReminder: (reminderId: number, referenceId: string | null) => Promise<void>;
export {};
//# sourceMappingURL=emailReminderManager.d.ts.map