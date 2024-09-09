import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import { SchedulingType } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";
export type ExtendedCalendarEvent = CalendarEvent & {
    metadata?: {
        videoCallUrl: string | undefined;
    };
    eventType: {
        slug?: string;
        schedulingType?: SchedulingType | null;
        hosts?: {
            user: {
                email: string;
                destinationCalendar?: {
                    primaryEmail: string | null;
                } | null;
            };
        }[];
    };
};
type ProcessWorkflowStepParams = {
    smsReminderNumber: string | null;
    calendarEvent: ExtendedCalendarEvent;
    emailAttendeeSendToOverride?: string;
    hideBranding?: boolean;
    seatReferenceUid?: string;
};
export interface ScheduleWorkflowRemindersArgs extends ProcessWorkflowStepParams {
    workflows: Workflow[];
    isNotConfirmed?: boolean;
    isRescheduleEvent?: boolean;
    isFirstRecurringEvent?: boolean;
}
export declare const scheduleWorkflowReminders: (args: ScheduleWorkflowRemindersArgs) => Promise<void>;
export interface SendCancelledRemindersArgs {
    workflows: Workflow[];
    smsReminderNumber: string | null;
    evt: ExtendedCalendarEvent;
    hideBranding?: boolean;
}
export declare const sendCancelledReminders: (args: SendCancelledRemindersArgs) => Promise<void>;
export {};
//# sourceMappingURL=reminderScheduler.d.ts.map