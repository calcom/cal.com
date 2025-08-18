import { BookingCreateService } from "@calcom/lib/server/service/booking/BookingCreateService";
import type { IBookingCreateService } from "@calcom/lib/server/service/booking/IBookingCreateService";

// Since the service doesn't require dependencies for now, we can create a singleton instance
let serviceInstance: IBookingCreateService | null = null;

export function getBookingCreateService(): IBookingCreateService {
  if (!serviceInstance) {
    serviceInstance = new BookingCreateService();
  }
  return serviceInstance;
}