import type { createLoggerWithEventDetails } from "../../handleNewBooking";
import type { HandleSeatsResultBooking, SeatedBooking, RescheduleSeatedBookingObject } from "../types";
declare const rescheduleSeatedBooking: (rescheduleSeatedBookingObject: RescheduleSeatedBookingObject, seatedBooking: SeatedBooking, resultBooking: HandleSeatsResultBooking | null, loggerWithEventDetails: ReturnType<typeof createLoggerWithEventDetails>) => Promise<HandleSeatsResultBooking>;
export default rescheduleSeatedBooking;
//# sourceMappingURL=rescheduleSeatedBooking.d.ts.map