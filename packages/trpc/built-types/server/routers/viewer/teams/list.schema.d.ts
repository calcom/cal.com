import { z } from "zod";
export declare const ZGetListSchema: z.ZodOptional<z.ZodObject<{
    includeOrgs: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeOrgs?: boolean | undefined;
}, {
    includeOrgs?: boolean | undefined;
}>>;
export type TGetListSchema = z.infer<typeof ZGetListSchema>;
