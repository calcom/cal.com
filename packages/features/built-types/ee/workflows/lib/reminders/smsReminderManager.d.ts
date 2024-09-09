import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { WorkflowActions } from "@calcom/prisma/enums";
import type { CalEventResponses, RecurringEvent } from "@calcom/types/Calendar";
import type { ScheduleReminderArgs } from "./emailReminderManager";
export declare enum timeUnitLowerCase {
    DAY = "day",
    MINUTE = "minute",
    YEAR = "year"
}
export type AttendeeInBookingInfo = {
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    timeZone: string;
    language: {
        locale: string;
    };
};
export type BookingInfo = {
    uid?: string | null;
    bookerUrl?: string;
    attendees: AttendeeInBookingInfo[];
    organizer: {
        language: {
            locale: string;
        };
        name: string;
        email: string;
        timeZone: string;
        timeFormat?: TimeFormat;
        username?: string;
    };
    eventType: {
        slug?: string;
        recurringEvent?: RecurringEvent | null;
    };
    startTime: string;
    endTime: string;
    title: string;
    location?: string | null;
    additionalNotes?: string | null;
    responses?: CalEventResponses | null;
    metadata?: Prisma.JsonValue;
};
export type ScheduleTextReminderAction = Extract<WorkflowActions, "SMS_ATTENDEE" | "SMS_NUMBER" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER">;
export interface ScheduleTextReminderArgs extends ScheduleReminderArgs {
    reminderPhone: string | null;
    message: string;
    action: ScheduleTextReminderAction;
    userId?: number | null;
    teamId?: number | null;
    isVerificationPending?: boolean;
    prisma?: PrismaClient;
}
export declare const scheduleSMSReminder: (args: ScheduleTextReminderArgs) => Promise<void>;
export declare const deleteScheduledSMSReminder: (reminderId: number, referenceId: string | null) => Promise<void>;
//# sourceMappingURL=smsReminderManager.d.ts.map