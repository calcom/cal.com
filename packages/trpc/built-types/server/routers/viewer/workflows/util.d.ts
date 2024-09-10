import type { Workflow } from "@prisma/client";
import type { z } from "zod";
import type { Workflow as WorkflowType } from "@calcom/ee/workflows/lib/types";
import type { Prisma, WorkflowStep } from "@calcom/prisma/client";
import type { TimeUnit } from "@calcom/prisma/enums";
import { WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { ZWorkflows } from "./getAllActiveWorkflows.schema";
export declare const bookingSelect: {
    userPrimaryEmail: boolean;
    startTime: boolean;
    endTime: boolean;
    title: boolean;
    uid: boolean;
    metadata: boolean;
    attendees: {
        select: {
            name: boolean;
            email: boolean;
            timeZone: boolean;
            locale: boolean;
        };
    };
    eventType: {
        select: {
            slug: boolean;
            id: boolean;
            schedulingType: boolean;
            hosts: {
                select: {
                    user: {
                        select: {
                            email: boolean;
                            destinationCalendar: {
                                select: {
                                    primaryEmail: boolean;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
    user: {
        select: {
            name: boolean;
            timeZone: boolean;
            timeFormat: boolean;
            locale: boolean;
            email: boolean;
        };
    };
};
export declare const verifyEmailSender: (email: string, userId: number, teamId: number | null) => Promise<void>;
export declare function getSender(step: Pick<WorkflowStep, "action" | "sender"> & {
    senderName: string | null | undefined;
}): string;
export declare function isAuthorized(workflow: Pick<Workflow, "id" | "teamId" | "userId"> | null, currentUserId: number, isWriteOperation?: boolean): Promise<boolean>;
export declare function upsertSmsReminderFieldForEventTypes({ activeOn, workflowId, isSmsReminderNumberRequired, isOrg, }: {
    activeOn: number[];
    workflowId: number;
    isSmsReminderNumberRequired: boolean;
    isOrg: boolean;
}): Promise<void>;
export declare function removeSmsReminderFieldForEventTypes({ activeOnToRemove, workflowId, isOrg, activeOn, }: {
    activeOnToRemove: number[];
    workflowId: number;
    isOrg: boolean;
    activeOn?: number[];
}): Promise<void>;
export declare function removeSmsReminderFieldForEventType({ workflowId, eventTypeId, }: {
    workflowId: number;
    eventTypeId: number;
}): Promise<void>;
export declare function isAuthorizedToAddActiveOnIds(newActiveIds: number[], isOrg: boolean, teamId?: number | null, userId?: number | null): Promise<boolean>;
export declare function deleteAllWorkflowReminders(remindersToDelete: {
    id: number;
    referenceId: string | null;
    method: string;
}[] | null): Promise<void>;
export declare function deleteRemindersOfActiveOnIds({ removedActiveOnIds, workflowSteps, isOrg, activeOnIds, }: {
    removedActiveOnIds: number[];
    workflowSteps: WorkflowStep[];
    isOrg: boolean;
    activeOnIds?: number[];
}): Promise<void>;
export declare function scheduleWorkflowNotifications(activeOn: number[], isOrg: boolean, workflowSteps: Partial<WorkflowStep>[], time: number | null, timeUnit: TimeUnit | null, trigger: WorkflowTriggerEvents, userId: number, teamId: number | null, alreadyScheduledActiveOnIds?: number[]): Promise<void>;
declare function getBookings(activeOn: number[], isOrg: boolean, alreadyScheduledActiveOnIds?: number[]): Promise<{
    eventType: {
        id: number;
        slug: string;
        schedulingType: import(".prisma/client").$Enums.SchedulingType | null;
        hosts: {
            user: {
                destinationCalendar: {
                    primaryEmail: string | null;
                } | null;
                email: string;
            };
        }[];
    } | null;
    title: string;
    metadata: Prisma.JsonValue;
    user: {
        timeZone: string;
        name: string | null;
        email: string;
        locale: string | null;
        timeFormat: number | null;
    } | null;
    uid: string;
    startTime: Date;
    endTime: Date;
    attendees: {
        timeZone: string;
        name: string;
        email: string;
        locale: string | null;
    }[];
    userPrimaryEmail: string | null;
}[]>;
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type Bookings = UnwrapPromise<ReturnType<typeof getBookings>>;
export declare function scheduleBookingReminders(bookings: Bookings, workflowSteps: Partial<WorkflowStep>[], time: number | null, timeUnit: TimeUnit | null, trigger: WorkflowTriggerEvents, userId: number, teamId: number | null): Promise<void[] | undefined>;
export declare function isStepEdited(oldStep: WorkflowStep, newStep: WorkflowStep): boolean;
export declare function getAllWorkflowsFromEventType(eventType: {
    workflows?: {
        workflow: WorkflowType;
    }[];
    teamId?: number | null;
    parentId?: number | null;
    parent?: {
        id?: number | null;
        teamId: number | null;
    } | null;
    metadata?: Prisma.JsonValue;
} | null, userId?: number | null): Promise<WorkflowType[]>;
export declare const getEventTypeWorkflows: (userId: number, eventTypeId: number) => Promise<z.infer<typeof ZWorkflows>>;
export {};
