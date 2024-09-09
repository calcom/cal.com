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
        name: string | null;
        id: number;
        email: string;
        timeZone: string;
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
