import type { BookingAuditTasker } from "@calcom/features/booking-audit/lib/tasker/BookingAuditTasker";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as taskerModuleLoader } from "./BookingAuditTasker.module";

const container = createContainer();

export function getBookingAuditTasker(): BookingAuditTasker {
  taskerModuleLoader.loadModule(container);
  return container.get<BookingAuditTasker>(taskerModuleLoader.token);
}
