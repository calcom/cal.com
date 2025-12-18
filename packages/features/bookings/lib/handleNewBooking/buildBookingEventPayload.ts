import type { BookingStatus } from "@calcom/prisma/enums";


export const buildBookingCreatedAuditData = ({ booking }: {
    booking: {
        startTime: Date;
        endTime: Date;
        status: BookingStatus;
    }
}) => {
    return {
        startTime: booking.startTime.getTime(),
        endTime: booking.endTime.getTime(),
        status: booking.status,
    }
};

export const buildBookingRescheduledAuditData = ({ oldBooking, newBooking }: {
    oldBooking: {
        startTime: Date;
        endTime: Date;
    };
    newBooking: {
        startTime: Date;
        endTime: Date;
        uid: string;
    };
}) => {
    return {
        startTime: {
            old: oldBooking.startTime.toISOString() ?? null,
            new: newBooking.startTime.toISOString(),
        },
        endTime: {
            old: oldBooking.endTime.toISOString() ?? null,
            new: newBooking.endTime.toISOString(),
        },
        rescheduledToUid: {
            old: null,
            new: newBooking.uid,
        },
    }
};