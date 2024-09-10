import type { TrpcSessionUser } from "../../../trpc";
import type { TEditInputSchema } from "./edit.schema";
type EditOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TEditInputSchema;
};
export declare const editHandler: ({ ctx, input }: EditOptions) => Promise<{
    id: string;
    userId: number;
    teamId: number | null;
    createdAt: Date;
    appId: string | null;
    note: string | null;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    hashedKey: string;
}>;
export {};
