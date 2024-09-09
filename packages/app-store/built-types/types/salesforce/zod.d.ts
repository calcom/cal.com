import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    credentialId: z.ZodOptional<z.ZodNumber>;
    appCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    roundRobinLeadSkip: z.ZodOptional<z.ZodBoolean>;
    skipContactCreation: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    roundRobinLeadSkip?: boolean | undefined;
    skipContactCreation?: boolean | undefined;
}, {
    enabled?: boolean | undefined;
    credentialId?: number | undefined;
    appCategories?: string[] | undefined;
    roundRobinLeadSkip?: boolean | undefined;
    skipContactCreation?: boolean | undefined;
}>;
export declare const appKeysSchema: z.ZodObject<{
    consumer_key: z.ZodString;
    consumer_secret: z.ZodString;
}, "strip", z.ZodTypeAny, {
    consumer_key: string;
    consumer_secret: string;
}, {
    consumer_key: string;
    consumer_secret: string;
}>;
//# sourceMappingURL=zod.d.ts.map