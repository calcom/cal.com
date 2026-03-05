import type {
  CreateBookingOutput_2024_08_13,
  GetBookingOutput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  RescheduleBookingOutput_2024_08_13,
} from "../../generated/types.gen";

export type Booking = GetBookingsOutput_2024_08_13["data"][number];
export type BookingResponse = GetBookingOutput_2024_08_13["data"];
export type CreateBookingResponse = CreateBookingOutput_2024_08_13["data"];
export type RescheduleBookingResponse = RescheduleBookingOutput_2024_08_13["data"];
export type BookingStatus = "upcoming" | "past" | "cancelled" | "recurring" | "unconfirmed";
