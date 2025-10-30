// Defines an interface that could be used by any type of Booking Service
// "Any" types are used because this inteface is used by RecurringBookingService which accepts an array of bookingData and RegularBookingService which accepts a single bookingData
// So, this interface enforces just the methods that must be present but not their parameters and return types
export interface IBookingCreateService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBooking: (...args: any[]) => Promise<any>;
}
