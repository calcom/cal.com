export enum ErrorCode {
  // 400 Bad Request - Client errors, invalid input, validation failures
  RequestBodyWithouEnd = "request_body_end_time_internal_error",
  MissingPaymentCredential = "missing_payment_credential_error",
  MissingPaymentAppId = "missing_payment_app_id_error",
  AvailabilityNotFoundInSchedule = "availability_not_found_in_schedule_error",
  CancelledBookingsCannotBeRescheduled = "cancelled_bookings_cannot_be_rescheduled",
  BookingTimeOutOfBounds = "booking_time_out_of_bounds_error",
  BookingNotAllowedByRestrictionSchedule = "booking_not_allowed_by_restriction_schedule_error",
  BookerLimitExceeded = "booker_limit_exceeded_error",
  BookerLimitExceededReschedule = "booker_limit_exceeded_error_reschedule",
  EventTypeNoHosts = "event_type_no_hosts",
  RequestBodyInvalid = "request_body_invalid_error",
  ChargeCardFailure = "couldnt_charge_card_error",
  InvalidInput = "invalid_input",
  MissingRequiredField = "missing_required_field",
  InvalidPhoneNumber = "invalid_phone_number",
  InvalidTimeZone = "invalid_timezone",
  InvalidOperation = "invalid_operation",
  ConfigurationError = "configuration_error",
  PrivateLinkExpired = "private_link_expired",
  BookerEmailBlocked = "booker_email_blocked",
  BookerEmailRequiresLogin = "booker_email_requires_login",
  InvalidVerificationCode = "invalid_verification_code",
  UnableToValidateVerificationCode = "unable_to_validate_verification_code",

  // 401 Unauthorized - Authentication required
  Unauthorized = "unauthorized",

  // 402 Payment Required - Payment needed to proceed
  PaymentRequired = "payment_required",

  // 403 Forbidden - Access denied, insufficient permissions
  Forbidden = "forbidden",

  // 404 Not Found - Resource does not exist
  EventTypeNotFound = "event_type_not_found_error",
  BookingNotFound = "booking_not_found_error",
  RestrictionScheduleNotFound = "restriction_schedule_not_found_error",
  ResourceNotFound = "resource_not_found",
  AgentNotFound = "agent_not_found",
  TeamNotFound = "team_not_found",
  UserNotFound = "user_not_found",
  CheckoutSessionNotFound = "checkout_session_not_found",
  SubscriptionNotFound = "subscription_not_found",

  // 409 Conflict - Resource conflicts, already exists, unavailable
  NoAvailableUsersFound = "no_available_users_found_error",
  FixedHostsUnavailableForBooking = "fixed_hosts_unavailable_for_booking",
  RoundRobinHostsUnavailableForBooking = "round_robin_host_unavailable_for_booking",
  AlreadySignedUpForBooking = "already_signed_up_for_this_booking_error",
  BookingSeatsFull = "booking_seats_full_error",
  NotEnoughAvailableSeats = "not_enough_available_seats_error",
  BookingConflict = "booking_conflict_error",
  PaymentCreationFailure = "payment_not_created_error",
  ResourceAlreadyExists = "resource_already_exists",

  // 500 Internal Server Error - Server-side errors, system failures
  InternalServerError = "internal_server_error",

  // 503 Service Unavailable - External services, temporary failures
  ServiceUnavailable = "service_unavailable",
}

export const ERROR_CODE_TO_HTTP_STATUS: Record<ErrorCode, number> = {
  // 400 Bad Request - Client errors, invalid input, validation failures
  [ErrorCode.RequestBodyWithouEnd]: 400,
  [ErrorCode.MissingPaymentCredential]: 400,
  [ErrorCode.MissingPaymentAppId]: 400,
  [ErrorCode.AvailabilityNotFoundInSchedule]: 400,
  [ErrorCode.CancelledBookingsCannotBeRescheduled]: 400,
  [ErrorCode.BookingTimeOutOfBounds]: 400,
  [ErrorCode.BookingNotAllowedByRestrictionSchedule]: 400,
  [ErrorCode.BookerLimitExceeded]: 400,
  [ErrorCode.BookerLimitExceededReschedule]: 400,
  [ErrorCode.EventTypeNoHosts]: 400,
  [ErrorCode.RequestBodyInvalid]: 400,
  [ErrorCode.ChargeCardFailure]: 400,
  [ErrorCode.InvalidInput]: 400,
  [ErrorCode.MissingRequiredField]: 400,
  [ErrorCode.InvalidPhoneNumber]: 400,
  [ErrorCode.InvalidTimeZone]: 400,
  [ErrorCode.InvalidOperation]: 400,
  [ErrorCode.ConfigurationError]: 400,
  [ErrorCode.PrivateLinkExpired]: 400,
  [ErrorCode.BookerEmailBlocked]: 400,
  [ErrorCode.BookerEmailRequiresLogin]: 400,
  [ErrorCode.InvalidVerificationCode]: 400,
  [ErrorCode.UnableToValidateVerificationCode]: 400,

  // 401 Unauthorized - Authentication required
  [ErrorCode.Unauthorized]: 401,

  // 402 Payment Required - Payment needed to proceed
  [ErrorCode.PaymentRequired]: 402,

  // 403 Forbidden - Access denied, insufficient permissions
  [ErrorCode.Forbidden]: 403,

  // 404 Not Found - Resource does not exist
  [ErrorCode.EventTypeNotFound]: 404,
  [ErrorCode.BookingNotFound]: 404,
  [ErrorCode.RestrictionScheduleNotFound]: 404,
  [ErrorCode.ResourceNotFound]: 404,
  [ErrorCode.TeamNotFound]: 404,
  [ErrorCode.UserNotFound]: 404,
  [ErrorCode.CheckoutSessionNotFound]: 404,
  [ErrorCode.SubscriptionNotFound]: 404,

  // 409 Conflict - Resource conflicts, already exists, unavailable
  [ErrorCode.NoAvailableUsersFound]: 409,
  [ErrorCode.FixedHostsUnavailableForBooking]: 409,
  [ErrorCode.RoundRobinHostsUnavailableForBooking]: 409,
  [ErrorCode.AlreadySignedUpForBooking]: 409,
  [ErrorCode.BookingSeatsFull]: 409,
  [ErrorCode.NotEnoughAvailableSeats]: 409,
  [ErrorCode.BookingConflict]: 409,
  [ErrorCode.PaymentCreationFailure]: 409,
  [ErrorCode.ResourceAlreadyExists]: 409,

  // 500 Internal Server Error - Server-side errors, system failures
  [ErrorCode.InternalServerError]: 500,

  // 503 Service Unavailable - External services, temporary failures
  [ErrorCode.ServiceUnavailable]: 503,
};

export function getHttpStatusForErrorCode(errorCode: ErrorCode): number {
  return ERROR_CODE_TO_HTTP_STATUS[errorCode] ?? 500;
}
