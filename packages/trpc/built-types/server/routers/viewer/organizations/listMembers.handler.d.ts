import type { TrpcSessionUser } from "../../../trpc";
import type { TListMembersSchema } from "./listMembers.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TListMembersSchema;
};
export declare const listMembersHandler: ({ ctx, input }: GetOptions) => Promise<{
    canUserGetMembers: boolean;
    rows: never[];
    meta: {
        totalRowCount: number;
    };
    nextCursor?: undefined;
} | {
    rows: {
        id: number;
        username: string | null;
        email: string;
        timeZone: string;
        role: import(".prisma/client").$Enums.MembershipRole;
        accepted: boolean;
        disableImpersonation: boolean;
        completedOnboarding: boolean;
        avatarUrl: string | null;
        teams: ({
            id: number;
            name: string;
            slug: string | null;
        } | undefined)[];
    }[];
    nextCursor: number | undefined;
    meta: {
        totalRowCount: number;
    };
    canUserGetMembers?: undefined;
}>;
export default listMembersHandler;
