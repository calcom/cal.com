import type { TrpcSessionUser } from "../../../trpc";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
declare const getSMSLockStateTeamsUsers: ({ ctx }: GetOptions) => Promise<{
    users: {
        locked: {
            name: string | null;
            id: number;
            email: string;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            username: string | null;
            avatarUrl: string | null;
        }[];
        reviewNeeded: {
            name: string | null;
            id: number;
            email: string;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
            username: string | null;
            avatarUrl: string | null;
        }[];
    };
    teams: {
        locked: {
            name: string;
            id: number;
            slug: string | null;
            logoUrl: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
        }[];
        reviewNeeded: {
            name: string;
            id: number;
            slug: string | null;
            logoUrl: string | null;
            smsLockState: import(".prisma/client").$Enums.SMSLockState;
        }[];
    };
}>;
export default getSMSLockStateTeamsUsers;
