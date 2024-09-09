import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TFormQueryInputSchema } from "./formQuery.schema";
interface FormsHandlerOptions {
    ctx: {
        prisma: PrismaClient;
        user: NonNullable<TrpcSessionUser>;
    };
    input: TFormQueryInputSchema;
}
export declare const formQueryHandler: ({ ctx, input }: FormsHandlerOptions) => Promise<import("../types/types").SerializableForm<{
    team: {
        name: string;
        slug: string | null;
    } | null;
    _count: {
        responses: number;
    };
} & {
    id: string;
    name: string;
    description: string | null;
    routes: import(".prisma/client").Prisma.JsonValue;
    fields: import(".prisma/client").Prisma.JsonValue;
    position: number;
    disabled: boolean;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
    teamId: number | null;
    settings: import(".prisma/client").Prisma.JsonValue;
}> | null>;
export default formQueryHandler;
//# sourceMappingURL=formQuery.handler.d.ts.map