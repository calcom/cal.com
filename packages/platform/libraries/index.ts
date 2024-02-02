import * as newBookingMethods from "@calcom/features/bookings/lib/handleNewBooking";

export { getEventTypeById } from "@calcom/lib/getEventTypeById";
export { EventService } from "@calcom/features/eventtypes/lib/event-service";
export { getUsernameList } from "@calcom/lib/defaultEvents";

const handleNewBooking = newBookingMethods.default;
export { handleNewBooking };
export { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";
