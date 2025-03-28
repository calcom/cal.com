import { getBookingWithResponses } from "@calcom/features/bookings/lib/get-booking";

import getUserBooking from "./getUserBooking";

const getBookingInfo = async (uid: string) => {
  const bookingInfoRaw = await getUserBooking(uid);

  if (!bookingInfoRaw) {
    return { bookingInfoRaw: undefined, bookingInfo: undefined };
  }

  let previousBooking = null;
  if (bookingInfoRaw.fromReschedule) {
    previousBooking = await getUserBooking(bookingInfoRaw.fromReschedule);
  }

  const bookingInfo = getBookingWithResponses(bookingInfoRaw);

  return { bookingInfoRaw, bookingInfo, previousBooking };
};

export default getBookingInfo;
