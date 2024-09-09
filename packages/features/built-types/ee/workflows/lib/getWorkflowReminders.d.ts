import type { EventType, Prisma, User, WorkflowReminder, WorkflowStep } from "@calcom/prisma/client";
type PartialWorkflowStep = (Partial<WorkflowStep> & {
    workflow: {
        userId?: number;
        teamId?: number;
    };
}) | null;
type Booking = Prisma.BookingGetPayload<{
    include: {
        attendees: true;
    };
}>;
type PartialBooking = (Pick<Booking, "startTime" | "endTime" | "location" | "description" | "metadata" | "customInputs" | "responses" | "uid" | "attendees" | "userPrimaryEmail" | "smsReminderNumber"> & {
    eventType: (Partial<EventType> & {
        team: {
            parentId?: number;
        };
        hosts: {
            user: {
                email: string;
                destinationCalendar?: {
                    primaryEmail: string;
                };
            };
        }[] | undefined;
    }) | null;
} & {
    user: Partial<User> | null;
}) | null;
export type PartialWorkflowReminder = Pick<WorkflowReminder, "id" | "isMandatoryReminder" | "scheduledDate"> & {
    booking: PartialBooking | null;
} & {
    workflowStep: PartialWorkflowStep;
};
type RemindersToDeleteType = {
    referenceId: string | null;
};
export declare function getAllRemindersToDelete(): Promise<RemindersToDeleteType[]>;
type RemindersToCancelType = {
    referenceId: string | null;
    id: number;
};
export declare function getAllRemindersToCancel(): Promise<RemindersToCancelType[]>;
export declare const select: Prisma.WorkflowReminderSelect;
export declare function getAllUnscheduledReminders(): Promise<PartialWorkflowReminder[]>;
export {};
//# sourceMappingURL=getWorkflowReminders.d.ts.map