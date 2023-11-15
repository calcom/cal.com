export enum ErrorCode {
  PaymentCreationFailure = "payment_not_created_error",
  NoAvailableUsersFound = "no_available_users_found_error",
  ChargeCardFailure = "couldnt_charge_card_error",
  RequestBodyWithouEnd = "request_body_end_time_internal_error",
  AlreadySignedUpForBooking = "already_signed_up_for_this_booking_error",
  HostsUnavailableForBooking = "hosts_unavailable_for_booking",
  EventTypeNotFound = "event_type_not_found_error",
}
