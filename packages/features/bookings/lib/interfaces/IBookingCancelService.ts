import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import type {
  CancelBookingMeta,
  CancelRegularBookingData,
  HandleCancelBookingResponse,
} from "../dto/BookingCancel";

export interface IBookingCancelService {
  cancelBooking(input: {
    bookingData: CancelRegularBookingData;
    bookingMeta?: CancelBookingMeta;
    actionSource: ValidActionSource;
  }): Promise<HandleCancelBookingResponse>;
}
