import { z } from "zod";
export declare const appDataSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const appKeysSchema: z.ZodObject<{
    client_id: z.ZodString;
    client_secret: z.ZodString;
    redirect_uris: z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodEffects<z.ZodString, string[], string>]>;
}, "strip", z.ZodTypeAny, {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
}, {
    client_id: string;
    client_secret: string;
    redirect_uris: (string | string[]) & (string | string[] | undefined);
}>;
//# sourceMappingURL=zod.d.ts.map