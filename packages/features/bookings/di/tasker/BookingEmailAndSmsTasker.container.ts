import { BookingEmailAndSmsTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTasker";
import { createContainer } from "@calcom/features/di/di";

import { moduleLoader as BookingEmailAndSmsTaskServiceModule } from "./BookingEmailAndSmsTaskService.module";

const container = createContainer();

export function getBookingEmailAndSmsTaskService(): BookingEmailAndSmsTasker {
  BookingEmailAndSmsTaskServiceModule.loadModule(container);
  return container.get<BookingEmailAndSmsTasker>(BookingEmailAndSmsTaskServiceModule.token);
}
