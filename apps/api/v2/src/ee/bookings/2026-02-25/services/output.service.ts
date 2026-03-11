import { Injectable } from "@nestjs/common";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";

type DatabaseBooking = Parameters<OutputBookingsService_2024_08_13["getOutputSeatedBooking"]>[0];
type RecurringDatabaseBooking = Parameters<OutputBookingsService_2024_08_13["getOutputRecurringSeatedBooking"]>[0];

@Injectable()
export class OutputBookingsService_2026_02_25 extends OutputBookingsService_2024_08_13 {
  constructor(bookingsRepository: BookingsRepository_2024_08_13) {
    super(bookingsRepository);
  }

  override async getOutputSeatedBooking(databaseBooking: DatabaseBooking, showAttendees: boolean) {
    const result = await super.getOutputSeatedBooking(databaseBooking, showAttendees);

    if (databaseBooking.status === "CANCELLED" && showAttendees) {
      result.attendees = this.mapSeatedAttendees(databaseBooking.attendees);
    }

    return result;
  }

  override getOutputRecurringSeatedBooking(databaseBooking: RecurringDatabaseBooking, showAttendees: boolean) {
    const result = super.getOutputRecurringSeatedBooking(databaseBooking, showAttendees);

    if (databaseBooking.status === "CANCELLED" && showAttendees) {
      result.attendees = this.mapSeatedAttendees(databaseBooking.attendees);
    }

    return result;
  }
}
