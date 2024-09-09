import type { PrismaClient } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TProjectMutationInputSchema } from "./projectMutation.schema";
interface ProjectMutationHandlerOptions {
    ctx: {
        prisma: PrismaClient;
        user: NonNullable<TrpcSessionUser>;
    };
    input: TProjectMutationInputSchema;
}
export declare const projectMutationHandler: ({ ctx, input }: ProjectMutationHandlerOptions) => Promise<{
    messsage: string;
}>;
export {};
//# sourceMappingURL=projectMutation.handler.d.ts.map