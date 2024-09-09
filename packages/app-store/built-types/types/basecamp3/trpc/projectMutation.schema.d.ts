import { z } from "zod";
export declare const ZProjectMutationInputSchema: z.ZodObject<{
    projectId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectId: string;
}, {
    projectId: string;
}>;
export type TProjectMutationInputSchema = z.infer<typeof ZProjectMutationInputSchema>;
//# sourceMappingURL=projectMutation.schema.d.ts.map