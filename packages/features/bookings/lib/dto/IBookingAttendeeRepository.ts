export interface IBookingAttendeeRepository {
  deleteManyByBookingId(bookingId: number): Promise<void>;
}
