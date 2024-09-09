import type { PrismaClient } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
interface ProjectsHandlerOptions {
    ctx: {
        prisma: PrismaClient;
        user: NonNullable<TrpcSessionUser>;
    };
}
export declare const projectHandler: ({ ctx }: ProjectsHandlerOptions) => Promise<{
    currentProject: number;
    projects: any;
} | undefined>;
export {};
//# sourceMappingURL=projects.handler.d.ts.map