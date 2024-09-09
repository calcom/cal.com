import type { TGetBookingAttendeesInputSchema } from "./getBookingAttendees.schema";
type GetBookingAttendeesOptions = {
    ctx: Record<string, unknown>;
    input: TGetBookingAttendeesInputSchema;
};
export declare const getBookingAttendeesHandler: ({ ctx: _ctx, input }: GetBookingAttendeesOptions) => Promise<number>;
export {};
