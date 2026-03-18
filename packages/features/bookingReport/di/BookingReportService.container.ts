import { createContainer } from "@calcom/features/di/di";
import {
  type BookingReportService,
  moduleLoader as bookingReportServiceModule,
} from "./BookingReportService.module";

const bookingReportServiceContainer = createContainer();

export function getBookingReportService(): BookingReportService {
  bookingReportServiceModule.loadModule(bookingReportServiceContainer);

  return bookingReportServiceContainer.get<BookingReportService>(bookingReportServiceModule.token);
}
