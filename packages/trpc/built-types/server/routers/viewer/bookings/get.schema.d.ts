import { z } from "zod";
export declare const ZGetInputSchema: z.ZodObject<{
    filters: z.ZodObject<{
        teamIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        userIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        status: z.ZodEnum<["upcoming", "recurring", "past", "cancelled", "unconfirmed"]>;
        eventTypeIds: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: "cancelled" | "upcoming" | "recurring" | "past" | "unconfirmed";
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        eventTypeIds?: number[] | undefined;
    }, {
        status: "cancelled" | "upcoming" | "recurring" | "past" | "unconfirmed";
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        eventTypeIds?: number[] | undefined;
    }>;
    limit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    cursor: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    filters: {
        status: "cancelled" | "upcoming" | "recurring" | "past" | "unconfirmed";
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        eventTypeIds?: number[] | undefined;
    };
    limit?: number | null | undefined;
    cursor?: number | null | undefined;
}, {
    filters: {
        status: "cancelled" | "upcoming" | "recurring" | "past" | "unconfirmed";
        teamIds?: number[] | undefined;
        userIds?: number[] | undefined;
        eventTypeIds?: number[] | undefined;
    };
    limit?: number | null | undefined;
    cursor?: number | null | undefined;
}>;
export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
