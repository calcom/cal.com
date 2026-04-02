import type { BookingAuditTaskConsumer } from "@calcom/features/booking-audit/lib/service/BookingAuditTaskConsumer";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as bookingAuditTaskConsumerModule } from "./BookingAuditTaskConsumer.module";

const container = createContainer();

export function getBookingAuditTaskConsumer() {
  bookingAuditTaskConsumerModule.loadModule(container);

  return container.get<BookingAuditTaskConsumer>(bookingAuditTaskConsumerModule.token);
}
