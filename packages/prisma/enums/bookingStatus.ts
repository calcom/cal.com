import type { BookingStatus } from "@prisma/client";

export const bookingStatus: { [K in BookingStatus]: K } = {
  CANCELLED: "CANCELLED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  PENDING: "PENDING",
};

export default bookingStatus;
