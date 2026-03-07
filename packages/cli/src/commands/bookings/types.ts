import type {
  BookingAttendeesController20240813AddAttendeeResponse,
  BookingGuestsController20240813AddGuestsResponse,
  BookingLocationController20240813UpdateBookingLocationResponse,
  BookingReferencesOutput_2024_08_13,
  BookingsController20240813CancelBookingResponse,
  BookingsController20240813ConfirmBookingResponse,
  BookingsController20240813DeclineBookingResponse,
  BookingsController20240813MarkNoShowResponse,
  BookingsController20240813ReassignBookingResponse,
  CalendarLinksOutput_2024_08_13,
  CreateBookingOutput_2024_08_13,
  GetBookingOutput_2024_08_13,
  GetBookingRecordingsOutput,
  GetBookingsOutput_2024_08_13,
  GetBookingTranscriptsOutput,
  GetBookingVideoSessionsOutput,
  RescheduleBookingOutput_2024_08_13,
} from "../../generated/types.gen";

export type Booking = GetBookingsOutput_2024_08_13["data"][number];
export type BookingList = GetBookingsOutput_2024_08_13["data"];
export type BookingResponse = GetBookingOutput_2024_08_13["data"];
export type CreateBookingResponse = CreateBookingOutput_2024_08_13["data"];
export type RescheduleBookingResponse = RescheduleBookingOutput_2024_08_13["data"];
export type BookingStatus = "upcoming" | "past" | "cancelled" | "recurring" | "unconfirmed";
export type BookingRecordings = GetBookingRecordingsOutput["data"];
export type BookingTranscripts = GetBookingTranscriptsOutput["data"];
export type BookingReferences = BookingReferencesOutput_2024_08_13["data"];
export type CalendarLinks = CalendarLinksOutput_2024_08_13["data"];
export type VideoSessions = GetBookingVideoSessionsOutput["data"];

export type BookingActionResponse =
  | BookingsController20240813CancelBookingResponse
  | BookingsController20240813ConfirmBookingResponse
  | BookingsController20240813DeclineBookingResponse
  | BookingsController20240813ReassignBookingResponse
  | BookingsController20240813MarkNoShowResponse
  | BookingAttendeesController20240813AddAttendeeResponse
  | BookingGuestsController20240813AddGuestsResponse
  | BookingLocationController20240813UpdateBookingLocationResponse;
