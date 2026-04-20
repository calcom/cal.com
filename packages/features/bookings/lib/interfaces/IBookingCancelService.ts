import type {
  CancelRegularBookingData,
  CancelBookingMeta,
  HandleCancelBookingResponse,
} from "../dto/BookingCancel";
type ValidActionSource = string;

export interface IBookingCancelService {
  cancelBooking(input: {
    bookingData: CancelRegularBookingData;
    bookingMeta?: CancelBookingMeta;
  }): Promise<HandleCancelBookingResponse>;
}
