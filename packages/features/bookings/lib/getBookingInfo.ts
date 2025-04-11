import { getBookingWithResponses } from "@calcom/features/bookings/lib/get-booking";

import getUserBooking from "./getUserBooking";

const getBookingInfo = async (uid: string) => {
  const bookingInfoRaw = await getUserBooking(uid);

  if (!bookingInfoRaw) {
    return { bookingInfoRaw: undefined, bookingInfo: undefined };
  }

  const bookingInfo = getBookingWithResponses(bookingInfoRaw);

  // Use type assertion to add the userDisplayEmail property
  const bookingInfoWithDisplay = bookingInfo as typeof bookingInfo & { userDisplayEmail?: string };

  // Add userDisplayEmail property
  bookingInfoWithDisplay.userDisplayEmail = bookingInfoWithDisplay.user?.email;

  return { bookingInfoRaw, bookingInfo: bookingInfoWithDisplay };
};

export default getBookingInfo;
