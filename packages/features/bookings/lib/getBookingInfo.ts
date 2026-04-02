import { getBookingWithResponses } from "@calcom/features/bookings/lib/get-booking";
import getUserBooking from "./getUserBooking";

const getBookingInfo = async (uid: string) => {
  const bookingInfoRaw = await getUserBooking(uid);

  if (!bookingInfoRaw) {
    return { bookingInfoRaw: undefined, bookingInfo: undefined };
  }

  const bookingInfo = getBookingWithResponses(bookingInfoRaw);

  return { bookingInfoRaw, bookingInfo };
};

export default getBookingInfo;
