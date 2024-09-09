import type { TrpcSessionUser } from "../../../trpc";
import type { TRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";
type RemoveHostsFromEventTypes = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TRemoveHostsFromEventTypes;
};
export declare function removeHostsFromEventTypesHandler({ ctx, input }: RemoveHostsFromEventTypes): Promise<import("@prisma/client/runtime/library").GetBatchResult>;
export default removeHostsFromEventTypesHandler;
