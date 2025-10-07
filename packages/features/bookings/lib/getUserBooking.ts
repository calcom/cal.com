import { getBookingOrDecoyForViewing } from "./getBookingOrDecoy";

const getUserBooking = async (uid: string) => {
  return await getBookingOrDecoyForViewing(uid);
};

export default getUserBooking;
