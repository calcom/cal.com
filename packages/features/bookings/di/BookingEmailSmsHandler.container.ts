import type { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as BookingEmailSmsHandlerModule } from "./BookingEmailSmsHandler.module";

const container = createContainer();

export function getInstantBookingCreateService(): BookingEmailSmsHandler {
  BookingEmailSmsHandlerModule.loadModule(container);
  return container.get<BookingEmailSmsHandler>(BookingEmailSmsHandlerModule.token);
}
