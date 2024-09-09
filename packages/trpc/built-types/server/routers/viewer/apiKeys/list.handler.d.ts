import type { TrpcSessionUser } from "../../../trpc";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listHandler: ({ ctx }: ListOptions) => Promise<{
    id: string;
    userId: number;
    createdAt: Date;
    teamId: number | null;
    appId: string | null;
    note: string | null;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    hashedKey: string;
}[]>;
export {};
