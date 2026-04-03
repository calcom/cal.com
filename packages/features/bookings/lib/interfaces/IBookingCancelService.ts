import type {
  CancelRegularBookingData,
  CancelBookingMeta,
  HandleCancelBookingResponse,
} from "../dto/BookingCancel";
import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";

export interface IBookingCancelService {
  cancelBooking(input: {
    bookingData: CancelRegularBookingData;
    bookingMeta?: CancelBookingMeta;
    actionSource: ValidActionSource;
  }): Promise<HandleCancelBookingResponse>;
}
