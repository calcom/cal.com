export enum ErrorCode {
  CreateCalendarEventFailure = "create_calendar_event_error",
  PaymentCreationFailure = "payment_not_created_error",
  NoAvailableUsersFound = "no_available_users_found_error",
  ChargeCardFailure = "couldnt_charge_card_error",
  RequestBodyWithouEnd = "request_body_end_time_internal_error",
  UpdateCalendarEventFailure = "update_calendar_event_error",
  DeleteCalendarEventFailure = "delete_calendar_event_error",
  AlreadySignedUpForBooking = "already_signed_up_for_this_booking_error",
  HostsUnavailableForBooking = "hosts_unavailable_for_booking",
}
