import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../trpc";
import type { TSaveKeysInputSchema } from "./saveKeys.schema";
type SaveKeysOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TSaveKeysInputSchema;
};
export declare const saveKeysHandler: ({ ctx, input }: SaveKeysOptions) => Promise<void>;
export {};
