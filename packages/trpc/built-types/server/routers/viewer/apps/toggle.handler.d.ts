import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../trpc";
import type { TToggleInputSchema } from "./toggle.schema";
type ToggleOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TToggleInputSchema;
};
export declare const toggleHandler: ({ input, ctx }: ToggleOptions) => Promise<boolean>;
export {};
