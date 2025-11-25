import type {
  CancelRegularBookingData,
  CancelBookingMeta,
  HandleCancelBookingResponse,
} from "../dto/BookingCancel";

export interface IBookingCancelService {
  cancelBooking(input: {
    bookingData: CancelRegularBookingData;
    bookingMeta?: CancelBookingMeta;
  }): Promise<HandleCancelBookingResponse>;
}
