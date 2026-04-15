export { getBookingAttendeesService } from "@calcom/features/bookings/di/BookingAttendeesService.container";
export { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
export { CheckBookingLimitsService } from "@calcom/features/bookings/lib/checkBookingLimits";
export type { RegularBookingCreateResult } from "@calcom/features/bookings/lib/dto/types";
export { LuckyUserService } from "@calcom/features/bookings/lib/getLuckyUser";
export { BookingCancelService } from "@calcom/features/bookings/lib/handleCancelBooking";
export { CheckBookingAndDurationLimitsService } from "@calcom/features/bookings/lib/handleNewBooking/checkBookingAndDurationLimits";
export { BookingEventHandlerService } from "@calcom/features/bookings/lib/onBookingEvents/BookingEventHandlerService";
export { RecurringBookingService } from "@calcom/features/bookings/lib/service/RecurringBookingService";
export { RegularBookingService } from "@calcom/features/bookings/lib/service/RegularBookingService";
export { BookingEmailAndSmsSyncTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsSyncTasker";
export { BookingEmailAndSmsTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTasker";
export { BookingEmailAndSmsTaskService } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTaskService";
export { BookingEmailAndSmsTriggerDevTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTriggerTasker";
export { BookingAttendeesRemoveService } from "@calcom/features/bookings/services/BookingAttendeesRemoveService";
export { BookingAttendeesService } from "@calcom/features/bookings/services/BookingAttendeesService";
export { getWebhookProducer } from "@calcom/features/di/webhooks/containers/webhook";
export { PrismaOrgMembershipRepository } from "@calcom/features/membership/repositories/PrismaOrgMembershipRepository";
export type { IWebhookProducerService } from "@calcom/features/webhooks/lib/interface/WebhookProducerService";
export {
  type BookingWithUserAndEventDetails,
  bookingWithUserAndEventDetailsSelect,
} from "@calcom/prisma/selects/booking";
export { addGuestsHandler } from "@calcom/trpc/server/routers/viewer/bookings/addGuests.handler";

// Booking audit was removed during EE cleanup — makeUserActor stub for API v2
export function makeUserActor(_uuid: string): { type: string; actorId: string } {
  return { type: "user", actorId: _uuid };
}
