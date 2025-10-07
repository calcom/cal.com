import { getBookingOrIntentForViewing } from "./getBookingOrIntent";

const getUserBooking = async (uid: string) => {
  return await getBookingOrIntentForViewing(uid);
};

export default getUserBooking;
