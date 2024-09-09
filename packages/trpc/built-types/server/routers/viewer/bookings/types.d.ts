import type { User } from "@prisma/client";
import { z } from "zod";
export type PersonAttendeeCommonFields = Pick<User, "id" | "email" | "name" | "locale" | "timeZone" | "username">;
export declare const commonBookingSchema: z.ZodObject<{
    bookingId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    bookingId: number;
}, {
    bookingId: number;
}>;
