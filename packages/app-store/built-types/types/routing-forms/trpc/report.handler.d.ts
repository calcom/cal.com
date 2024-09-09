import type { z } from "zod";
import type { PrismaClient } from "@calcom/prisma";
import type { App_RoutingForms_FormResponse } from "@calcom/prisma/client";
import type { zodFieldView } from "../zod";
import type { TReportInputSchema } from "./report.schema";
interface ReportHandlerOptions {
    ctx: {
        prisma: PrismaClient;
    };
    input: TReportInputSchema;
}
export declare const reportHandler: ({ ctx: { prisma }, input }: ReportHandlerOptions) => Promise<{
    headers: string[];
    responses: string[][];
    nextCursor: number | null;
}>;
export default reportHandler;
export declare function buildResponsesForReporting({ responsesFromDb, fields, }: {
    responsesFromDb: App_RoutingForms_FormResponse["response"][];
    fields: Pick<z.infer<typeof zodFieldView>, "id" | "options" | "label" | "deleted">[];
}): {
    responses: string[][];
    headers: string[];
};
//# sourceMappingURL=report.handler.d.ts.map