import type { Prisma } from "@prisma/client";
import type { EventManagerUser } from "@calcom/core/EventManager";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { PrismaClient } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
export declare function handleConfirmation(args: {
    user: EventManagerUser & {
        username: string | null;
    };
    evt: CalendarEvent;
    recurringEventId?: string;
    prisma: PrismaClient;
    bookingId: number;
    booking: {
        eventType: {
            currency: string;
            description: string | null;
            id: number;
            length: number;
            price: number;
            requiresConfirmation: boolean;
            metadata?: Prisma.JsonValue;
            title: string;
            team?: {
                parentId: number | null;
            } | null;
            teamId?: number | null;
            parentId?: number | null;
            parent?: {
                teamId: number | null;
            } | null;
            workflows?: {
                workflow: Workflow;
            }[];
        } | null;
        metadata?: Prisma.JsonValue;
        eventTypeId: number | null;
        smsReminderNumber: string | null;
        userId: number | null;
    };
    paid?: boolean;
}): Promise<void>;
//# sourceMappingURL=handleConfirmation.d.ts.map