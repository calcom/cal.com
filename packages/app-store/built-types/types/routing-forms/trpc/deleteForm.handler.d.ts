import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TDeleteFormInputSchema } from "./deleteForm.schema";
interface DeleteFormHandlerOptions {
    ctx: {
        prisma: PrismaClient;
        user: NonNullable<TrpcSessionUser>;
    };
    input: TDeleteFormInputSchema;
}
export declare const deleteFormHandler: ({ ctx, input }: DeleteFormHandlerOptions) => Promise<import("@prisma/client/runtime/library").GetBatchResult>;
export default deleteFormHandler;
//# sourceMappingURL=deleteForm.handler.d.ts.map