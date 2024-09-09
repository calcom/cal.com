import { z } from "zod";
export declare const ZGetMemberAvailabilityInputSchema: z.ZodObject<{
    teamId: z.ZodNumber;
    memberId: z.ZodNumber;
    timezone: z.ZodString;
    dateFrom: z.ZodString;
    dateTo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    teamId: number;
    dateFrom: string;
    dateTo: string;
    memberId: number;
    timezone: string;
}, {
    teamId: number;
    dateFrom: string;
    dateTo: string;
    memberId: number;
    timezone: string;
}>;
export type TGetMemberAvailabilityInputSchema = z.infer<typeof ZGetMemberAvailabilityInputSchema>;
