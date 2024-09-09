import { z } from "zod";
export declare const ZNoShowInputSchema: z.ZodEffects<z.ZodObject<{
    bookingUid: z.ZodString;
    attendees: z.ZodOptional<z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        noShow: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        email: string;
        noShow: boolean;
    }, {
        email: string;
        noShow: boolean;
    }>, "many">>;
    noShowHost: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    bookingUid: string;
    attendees?: {
        email: string;
        noShow: boolean;
    }[] | undefined;
    noShowHost?: boolean | undefined;
}, {
    bookingUid: string;
    attendees?: {
        email: string;
        noShow: boolean;
    }[] | undefined;
    noShowHost?: boolean | undefined;
}>, {
    bookingUid: string;
    attendees?: {
        email: string;
        noShow: boolean;
    }[] | undefined;
    noShowHost?: boolean | undefined;
}, {
    bookingUid: string;
    attendees?: {
        email: string;
        noShow: boolean;
    }[] | undefined;
    noShowHost?: boolean | undefined;
}>;
export type TNoShowInputSchema = z.infer<typeof ZNoShowInputSchema>;
