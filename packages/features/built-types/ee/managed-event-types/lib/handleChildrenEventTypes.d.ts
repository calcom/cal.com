import type { Prisma } from "@prisma/client";
import type { DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
interface handleChildrenEventTypesProps {
    eventTypeId: number;
    profileId: number | null;
    updatedEventType: {
        schedulingType: SchedulingType | null;
        slug: string;
    };
    currentUserId: number;
    oldEventType: {
        children?: {
            userId: number | null;
        }[] | null | undefined;
        team: {
            name: string;
        } | null;
        workflows?: {
            workflowId: number;
        }[];
    } | null;
    hashedLink: string | undefined;
    connectedLink: {
        id: number;
    } | null;
    children: {
        hidden: boolean;
        owner: {
            id: number;
            name: string;
            email: string;
            eventTypeSlugs: string[];
        };
    }[] | undefined;
    prisma: PrismaClient | DeepMockProxy<PrismaClient>;
    updatedValues: Prisma.EventTypeUpdateInput;
}
export default function handleChildrenEventTypes({ eventTypeId: parentId, oldEventType, updatedEventType, hashedLink, connectedLink, children, prisma, profileId, updatedValues, }: handleChildrenEventTypesProps): Promise<{
    message: string;
    newUserIds?: undefined;
    oldUserIds?: undefined;
    deletedUserIds?: undefined;
    deletedExistentEventTypes?: undefined;
} | {
    newUserIds: number[] | undefined;
    oldUserIds: number[] | undefined;
    deletedUserIds: number[] | undefined;
    deletedExistentEventTypes: import("@prisma/client/runtime/library").GetBatchResult | undefined;
    message?: undefined;
}>;
export {};
//# sourceMappingURL=handleChildrenEventTypes.d.ts.map