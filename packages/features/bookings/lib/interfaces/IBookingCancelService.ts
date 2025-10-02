// Defines an interface that could be used by any type of Booking Cancel Service
export interface IBookingCancelService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cancelBooking: (...args: any[]) => Promise<any>;
}
