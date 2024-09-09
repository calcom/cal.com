import type { BookingCreateBody } from "../types";
export declare const createInstantBooking: (data: BookingCreateBody) => Promise<Omit<{
    message: string;
    meetingTokenId: number;
    bookingId: number;
    bookingUid: string;
    expires: Date;
    userId: number | null;
}, "startTime" | "endTime"> & {
    startTime: string;
    endTime: string;
}>;
//# sourceMappingURL=create-instant-booking.d.ts.map