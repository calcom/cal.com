import type { TrpcSessionUser } from "../../../trpc";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
declare const getSMSLockStateTeamsUsers: ({ ctx }: GetOptions) => Promise<{
    users: {
        locked: {
            id: number;
            name: string | null;
            email: string;
            username: string | null;
            avatarUrl: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
        }[];
        reviewNeeded: {
            id: number;
            name: string | null;
            email: string;
            username: string | null;
            avatarUrl: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
        }[];
    };
    teams: {
        locked: {
            id: number;
            slug: string | null;
            name: string;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            logoUrl: string | null;
        }[];
        reviewNeeded: {
            id: number;
            slug: string | null;
            name: string;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            logoUrl: string | null;
        }[];
    };
}>;
export default getSMSLockStateTeamsUsers;
