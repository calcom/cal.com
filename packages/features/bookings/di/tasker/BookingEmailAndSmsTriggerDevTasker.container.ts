import type { BookingEmailAndSmsTriggerDevTasker } from "@calcom/features/bookings/lib/tasker/BookingEmailAndSmsTriggerTasker";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as BookingEmailAndSmsTriggerDevTaskerModule } from "./BookingEmailAndSmsTriggerDevTasker.module";

const container = createContainer();

export function getBookingEmailAndSmsTriggerDevTasker(): BookingEmailAndSmsTriggerDevTasker {
  BookingEmailAndSmsTriggerDevTaskerModule.loadModule(container);
  return container.get<BookingEmailAndSmsTriggerDevTasker>(BookingEmailAndSmsTriggerDevTaskerModule.token);
}
