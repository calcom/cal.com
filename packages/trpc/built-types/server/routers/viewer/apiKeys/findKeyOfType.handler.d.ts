import type { TrpcSessionUser } from "../../../trpc";
import type { TFindKeyOfTypeInputSchema } from "./findKeyOfType.schema";
type FindKeyOfTypeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TFindKeyOfTypeInputSchema;
};
export declare const findKeyOfTypeHandler: ({ ctx, input }: FindKeyOfTypeOptions) => Promise<{
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
