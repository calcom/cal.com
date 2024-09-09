import type { TrpcSessionUser } from "../../../trpc";
import type { TBulkUsersDelete } from "./bulkDeleteUsers.schema.";
type BulkDeleteUsersHandler = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TBulkUsersDelete;
};
export declare function bulkDeleteUsersHandler({ ctx, input }: BulkDeleteUsersHandler): Promise<{
    success: boolean;
    usersDeleted: number;
}>;
export default bulkDeleteUsersHandler;
