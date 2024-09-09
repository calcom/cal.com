import { z } from "zod";
export declare const filterQuerySchemaStrict: z.ZodObject<{
    teamIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    upIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    schedulingTypes: z.ZodOptional<z.ZodArray<z.ZodNativeEnum<{
        readonly ROUND_ROBIN: "ROUND_ROBIN";
        readonly COLLECTIVE: "COLLECTIVE";
        readonly MANAGED: "MANAGED";
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    teamIds?: number[] | undefined;
    upIds?: string[] | undefined;
    schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
}, {
    teamIds?: number[] | undefined;
    upIds?: string[] | undefined;
    schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
}>;
export declare const ZEventTypeInputSchema: z.ZodOptional<z.ZodNullable<z.ZodObject<{
    filters: z.ZodOptional<z.ZodObject<{
        teamIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        upIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        schedulingTypes: z.ZodOptional<z.ZodArray<z.ZodNativeEnum<{
            readonly ROUND_ROBIN: "ROUND_ROBIN";
            readonly COLLECTIVE: "COLLECTIVE";
            readonly MANAGED: "MANAGED";
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        teamIds?: number[] | undefined;
        upIds?: string[] | undefined;
        schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
    }, {
        teamIds?: number[] | undefined;
        upIds?: string[] | undefined;
        schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
    }>>;
    forRoutingForms: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    filters?: {
        teamIds?: number[] | undefined;
        upIds?: string[] | undefined;
        schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
    } | undefined;
    forRoutingForms?: boolean | undefined;
}, {
    filters?: {
        teamIds?: number[] | undefined;
        upIds?: string[] | undefined;
        schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
    } | undefined;
    forRoutingForms?: boolean | undefined;
}>>>;
export type TEventTypeInputSchema = z.infer<typeof ZEventTypeInputSchema>;
export declare const ZGetEventTypesFromGroupSchema: z.ZodObject<{
    filters: z.ZodOptional<z.ZodObject<{
        teamIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        upIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        schedulingTypes: z.ZodOptional<z.ZodArray<z.ZodNativeEnum<{
            readonly ROUND_ROBIN: "ROUND_ROBIN";
            readonly COLLECTIVE: "COLLECTIVE";
            readonly MANAGED: "MANAGED";
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        teamIds?: number[] | undefined;
        upIds?: string[] | undefined;
        schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
    }, {
        teamIds?: number[] | undefined;
        upIds?: string[] | undefined;
        schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
    }>>;
    forRoutingForms: z.ZodOptional<z.ZodBoolean>;
    cursor: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodNumber>;
    group: z.ZodObject<{
        teamId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        parentId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        teamId?: number | null | undefined;
        parentId?: number | null | undefined;
    }, {
        teamId?: number | null | undefined;
        parentId?: number | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    group: {
        teamId?: number | null | undefined;
        parentId?: number | null | undefined;
    };
    filters?: {
        teamIds?: number[] | undefined;
        upIds?: string[] | undefined;
        schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
    } | undefined;
    forRoutingForms?: boolean | undefined;
    cursor?: number | null | undefined;
}, {
    group: {
        teamId?: number | null | undefined;
        parentId?: number | null | undefined;
    };
    filters?: {
        teamIds?: number[] | undefined;
        upIds?: string[] | undefined;
        schedulingTypes?: ("ROUND_ROBIN" | "COLLECTIVE" | "MANAGED")[] | undefined;
    } | undefined;
    forRoutingForms?: boolean | undefined;
    cursor?: number | null | undefined;
    limit?: number | undefined;
}>;
export type TGetEventTypesFromGroupSchema = z.infer<typeof ZGetEventTypesFromGroupSchema>;
