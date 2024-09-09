import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TCreateInputSchema } from "./create.schema";
type CreateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TCreateInputSchema;
};
export declare const createHandler: ({ ctx, input }: CreateOptions) => Promise<{
    workflow: {
        id: number;
        position: number;
        name: string;
        userId: number | null;
        teamId: number | null;
        isActiveOnAll: boolean;
        trigger: import(".prisma/client").$Enums.WorkflowTriggerEvents;
        time: number | null;
        timeUnit: import(".prisma/client").$Enums.TimeUnit | null;
    };
}>;
export {};
