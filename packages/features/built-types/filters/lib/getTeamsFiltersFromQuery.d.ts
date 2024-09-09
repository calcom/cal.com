import type { ParsedUrlQuery } from "querystring";
import { z } from "zod";
import type { RouterOutputs } from "@calcom/trpc/react";
export type IEventTypesFilters = RouterOutputs["viewer"]["eventTypes"]["listWithTeam"];
export type IEventTypeFilter = IEventTypesFilters[0];
export declare const filterQuerySchema: z.ZodObject<{
    teamIds: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodUnion<[z.ZodString, z.ZodNumber]>, z.ZodArray<z.ZodNumber, "many">]>, number[], string | number | number[]>>;
    userIds: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodUnion<[z.ZodString, z.ZodNumber]>, z.ZodArray<z.ZodNumber, "many">]>, number[], string | number | number[]>>;
    upIds: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>, string[], string | string[]>>;
}, "strip", z.ZodTypeAny, {
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    upIds?: string[] | undefined;
}, {
    teamIds?: string | number | number[] | undefined;
    userIds?: string | number | number[] | undefined;
    upIds?: string | string[] | undefined;
}>;
export declare const filterQuerySchemaStrict: z.ZodObject<{
    teamIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    userIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    upIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    upIds?: string[] | undefined;
}, {
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    upIds?: string[] | undefined;
}>;
export declare const getTeamsFiltersFromQuery: (query: ParsedUrlQuery) => {
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    upIds?: string[] | undefined;
} | undefined;
//# sourceMappingURL=getTeamsFiltersFromQuery.d.ts.map