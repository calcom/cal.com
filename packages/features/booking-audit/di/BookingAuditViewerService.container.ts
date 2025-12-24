import { createContainer } from "@calcom/features/di/di";

import {
  type BookingAuditViewerService,
  moduleLoader as bookingAuditViewerServiceModule,
} from "./BookingAuditViewerService.module";

const container = createContainer();

export function getBookingAuditViewerService() {
  bookingAuditViewerServiceModule.loadModule(container);

  return container.get<BookingAuditViewerService>(bookingAuditViewerServiceModule.token);
}

