import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TFormMutationInputSchema } from "./formMutation.schema";
interface FormMutationHandlerOptions {
    ctx: {
        prisma: PrismaClient;
        user: NonNullable<TrpcSessionUser>;
    };
    input: TFormMutationInputSchema;
}
export declare const formMutationHandler: ({ ctx, input }: FormMutationHandlerOptions) => Promise<{
    id: string;
    name: string;
    description: string | null;
    routes: Prisma.JsonValue;
    fields: Prisma.JsonValue;
    position: number;
    disabled: boolean;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
    teamId: number | null;
    settings: Prisma.JsonValue;
}>;
export default formMutationHandler;
//# sourceMappingURL=formMutation.handler.d.ts.map