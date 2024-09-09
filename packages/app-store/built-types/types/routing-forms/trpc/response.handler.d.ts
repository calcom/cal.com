import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@calcom/prisma";
import type { TResponseInputSchema } from "./response.schema";
interface ResponseHandlerOptions {
    ctx: {
        prisma: PrismaClient;
    };
    input: TResponseInputSchema;
}
export declare const responseHandler: ({ ctx, input }: ResponseHandlerOptions) => Promise<{
    id: number;
    createdAt: Date;
    formFillerId: string;
    formId: string;
    response: Prisma.JsonValue;
}>;
export default responseHandler;
//# sourceMappingURL=response.handler.d.ts.map