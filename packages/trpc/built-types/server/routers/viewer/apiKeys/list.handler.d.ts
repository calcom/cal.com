import type { TrpcSessionUser } from "../../../trpc";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listHandler: ({ ctx }: ListOptions) => Promise<{
    id: string;
    userId: number;
    teamId: number | null;
    createdAt: Date;
    appId: string | null;
    note: string | null;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    hashedKey: string;
}[]>;
export {};
