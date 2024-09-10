import type { TrpcSessionUser } from "../../../trpc";
import type { TListMembersSchema } from "./listPaginated.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TListMembersSchema;
};
declare const listPaginatedHandler: ({ input }: GetOptions) => Promise<{
    rows: {
        id: number;
        timeZone: string;
        name: string | null;
        email: string;
        username: string | null;
        role: import(".prisma/client").$Enums.UserPermissionRole;
        locked: boolean;
    }[];
    nextCursor: number | undefined;
    meta: {
        totalRowCount: number;
    };
}>;
export default listPaginatedHandler;
