import type { BookingAuditProducerService } from "@calcom/features/booking-audit/lib/service/BookingAuditProducerService.interface";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as bookingAuditTaskerProducerServiceModule } from "./BookingAuditTaskerProducerService.module";

const container = createContainer();

export function getBookingAuditProducerService() {
  bookingAuditTaskerProducerServiceModule.loadModule(container);

  return container.get<BookingAuditProducerService>(bookingAuditTaskerProducerServiceModule.token);
}
