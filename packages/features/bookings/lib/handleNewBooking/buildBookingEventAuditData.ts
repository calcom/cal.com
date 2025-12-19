import type { BookingStatus } from "@calcom/prisma/enums";


export const buildBookingCreatedAuditData = ({ booking }: {
    booking: {
        startTime: Date;
        endTime: Date;
        status: BookingStatus;
        userUuid: string | null;
    }
}) => {
    return {
        startTime: booking.startTime.getTime(),
        endTime: booking.endTime.getTime(),
        status: booking.status,
        hostUserUuid: booking.userUuid,
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
            old: oldBooking.startTime.getTime() ?? null,
            new: newBooking.startTime.getTime(),
        },
        endTime: {
            old: oldBooking.endTime.getTime() ?? null,
            new: newBooking.endTime.getTime(),
        },
        rescheduledToUid: {
            old: null,
            new: newBooking.uid,
        },
    }
};