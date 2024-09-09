import z from "zod";
export declare const filterQuerySchema: z.ZodObject<{
    teamIds: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodUnion<[z.ZodString, z.ZodNumber]>, z.ZodArray<z.ZodNumber, "many">]>, number[], string | number | number[]>>;
    userIds: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodUnion<[z.ZodString, z.ZodNumber]>, z.ZodArray<z.ZodNumber, "many">]>, number[], string | number | number[]>>;
    status: z.ZodOptional<z.ZodEnum<["upcoming", "recurring", "past", "cancelled", "unconfirmed"]>>;
    eventTypeIds: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodUnion<[z.ZodString, z.ZodNumber]>, z.ZodArray<z.ZodNumber, "many">]>, number[], string | number | number[]>>;
}, "strip", z.ZodTypeAny, {
    teamIds?: number[] | undefined;
    userIds?: number[] | undefined;
    status?: "cancelled" | "upcoming" | "recurring" | "past" | "unconfirmed" | undefined;
    eventTypeIds?: number[] | undefined;
}, {
    teamIds?: string | number | number[] | undefined;
    userIds?: string | number | number[] | undefined;
    status?: "cancelled" | "upcoming" | "recurring" | "past" | "unconfirmed" | undefined;
    eventTypeIds?: string | number | number[] | undefined;
}>;
export declare function useFilterQuery(): {
    data: {
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        status?: "cancelled" | "upcoming" | "recurring" | "past" | "unconfirmed" | undefined;
        eventTypeIds?: number[] | undefined;
    };
    setQuery: <J extends "status" | "userIds" | "teamIds" | "eventTypeIds">(key: J, value: {
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        status?: "cancelled" | "upcoming" | "recurring" | "past" | "unconfirmed" | undefined;
        eventTypeIds?: number[] | undefined;
    }[J]) => void;
    removeByKey: (key: "status" | "userIds" | "teamIds" | "eventTypeIds") => void;
    pushItemToKey: <J_1 extends "userIds" | "teamIds" | "eventTypeIds">(key: J_1, value: {
        teamIds: number[];
        userIds: number[];
        eventTypeIds: number[];
    }[J_1][number]) => void;
    removeItemByKeyAndValue: <J_2 extends "userIds" | "teamIds" | "eventTypeIds">(key: J_2, value: {
        teamIds: number[];
        userIds: number[];
        eventTypeIds: number[];
    }[J_2][number]) => void;
    removeAllQueryParams: () => void;
};
//# sourceMappingURL=useFilterQuery.d.ts.map