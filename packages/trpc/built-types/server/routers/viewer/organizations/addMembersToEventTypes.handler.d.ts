import type { TrpcSessionUser } from "../../../trpc";
import type { TAddMembersToEventTypes } from "./addMembersToEventTypes.schema";
type AddBulkToEventTypeHandler = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAddMembersToEventTypes;
};
export declare function addMembersToEventTypesHandler({ ctx, input }: AddBulkToEventTypeHandler): Promise<import("@prisma/client/runtime/library").GetBatchResult>;
export default addMembersToEventTypesHandler;
