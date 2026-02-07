import type { BookingStatus } from "@calcom/prisma/enums";

export const buildBookingCreatedAuditData = ({
  booking,
  attendeeSeatId,
}: {
  attendeeSeatId: string | null;
  booking: {
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    userUuid: string | null;
  };
}) => {
  return {
    startTime: booking.startTime.getTime(),
    endTime: booking.endTime.getTime(),
    status: booking.status,
    hostUserUuid: booking.userUuid,
    seatReferenceUid: attendeeSeatId,
  };
};

export const buildBookingRescheduledAuditData = ({
  oldBooking,
  newBooking,
}: {
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
      old: oldBooking.startTime.getTime(),
      new: newBooking.startTime.getTime(),
    },
    endTime: {
      old: oldBooking.endTime.getTime(),
      new: newBooking.endTime.getTime(),
    },
    rescheduledToUid: {
      old: null,
      new: newBooking.uid,
    },
  };
};

export const buildSeatBookedAuditData = ({
  seatReferenceUid,
  attendeeEmail,
  attendeeName,
  startTime,
  endTime,
}: {
  seatReferenceUid: string;
  attendeeEmail: string;
  attendeeName: string;
  startTime: Date;
  endTime: Date;
}) => {
  return {
    seatReferenceUid,
    attendeeEmail,
    attendeeName,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
  };
};

export const buildSeatRescheduledAuditData = ({
  seatReferenceUid,
  attendeeEmail,
  oldBooking,
  newBooking,
  rescheduledToBookingUid,
}: {
  seatReferenceUid: string;
  attendeeEmail: string;
  oldBooking: {
    startTime: Date;
    endTime: Date;
  };
  newBooking: {
    startTime: Date;
    endTime: Date;
  };
  rescheduledToBookingUid: string | null;
}) => {
  return {
    seatReferenceUid,
    attendeeEmail,
    startTime: {
      old: oldBooking.startTime.getTime(),
      new: newBooking.startTime.getTime(),
    },
    endTime: {
      old: oldBooking.endTime.getTime(),
      new: newBooking.endTime.getTime(),
    },
    rescheduledToBookingUid: {
      old: null,
      new: rescheduledToBookingUid,
    },
  };
};
