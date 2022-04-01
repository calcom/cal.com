import {
  User,
  ApiKey,
  Team,
  Credential,
  SelectedCalendar,
  EventType,
  EventTypeCustomInput,
  Attendee,
  Availability,
  BookingReference,
  Booking,
  DailyEventReference,
  Webhook,
  DestinationCalendar,
  Membership,
  Payment,
  Schedule,
} from "@calcom/prisma/client";

// Base response, used for all responses
export type BaseResponse = {
  message?: string;
  error?: Error;
};

// User
export type UserResponse = BaseResponse & {
  data?: Partial<User>;
};

export type UsersResponse = BaseResponse & {
  data?: Partial<User>[];
};

// API Key
export type ApiKeyResponse = BaseResponse & {
  data?: Partial<ApiKey>;
};
export type ApiKeysResponse = BaseResponse & {
  data?: Partial<ApiKey>[];
};

// Team
export type TeamResponse = BaseResponse & {
  data?: Partial<Team>;
};
export type TeamsResponse = BaseResponse & {
  data?: Partial<Team>[];
};

// SelectedCalendar
export type SelectedCalendarResponse = BaseResponse & {
  data?: Partial<SelectedCalendar>;
};
export type SelectedCalendarsResponse = BaseResponse & {
  data?: Partial<SelectedCalendar>[];
};

// Attendee
export type AttendeeResponse = BaseResponse & {
  data?: Partial<Attendee>;
};
export type AttendeesResponse = BaseResponse & {
  data?: Partial<Attendee>[];
};

// Availability
export type AvailabilityResponse = BaseResponse & {
  data?: Partial<Availability>;
};
export type AvailabilitysResponse = BaseResponse & {
  data?: Partial<Availability>[];
};

// BookingReference
export type BookingReferenceResponse = BaseResponse & {
  data?: Partial<BookingReference>;
};
export type BookingReferencesResponse = BaseResponse & {
  data?: Partial<BookingReference>[];
};

// Booking
export type BookingResponse = BaseResponse & {
  data?: Partial<Booking>;
};
export type BookingsResponse = BaseResponse & {
  data?: Partial<Booking>[];
};

// Credential
export type CredentialResponse = BaseResponse & {
  data?: Partial<Credential>;
};
export type CredentialsResponse = BaseResponse & {
  data?: Partial<Credential>[];
};

// DailyEventReference
export type DailyEventReferenceResponse = BaseResponse & {
  data?: Partial<DailyEventReference>;
};
export type DailyEventReferencesResponse = BaseResponse & {
  data?: Partial<DailyEventReference>[];
};

// DestinationCalendar
export type DestinationCalendarResponse = BaseResponse & {
  data?: Partial<DestinationCalendar>;
};
export type DestinationCalendarsResponse = BaseResponse & {
  data?: Partial<DestinationCalendar>[];
};

// Membership
export type MembershipResponse = BaseResponse & {
  data?: Partial<Membership>;
};
export type MembershipsResponse = BaseResponse & {
  data?: Partial<Membership>[];
};

// EventTypeCustomInput
export type EventTypeCustomInputResponse = BaseResponse & {
  data?: Partial<EventTypeCustomInput>;
};
export type EventTypeCustomInputsResponse = BaseResponse & {
  data?: Partial<EventTypeCustomInput>[];
};

// EventType
export type EventTypeResponse = BaseResponse & {
  data?: Partial<EventType>;
};
export type EventTypesResponse = BaseResponse & {
  data?: Partial<EventType>[];
};

// Payment
export type PaymentResponse = BaseResponse & {
  data?: Partial<Payment>;
};
export type PaymentsResponse = BaseResponse & {
  data?: Partial<Payment>[];
};

// Schedule
export type ScheduleResponse = BaseResponse & {
  data?: Partial<Schedule>;
};
export type SchedulesResponse = BaseResponse & {
  data?: Partial<Schedule>[];
};

// Webhook
export type WebhookResponse = BaseResponse & {
  data?: Partial<Webhook>;
};
export type WebhooksResponse = BaseResponse & {
  data?: Partial<Webhook>[];
};
