import type { EventLocationType } from "@calcom/app-store/locations";
import type {
  Attendee,
  Availability,
  Booking,
  BookingReference,
  Credential,
  DestinationCalendar,
  EventType,
  EventTypeCustomInput,
  Membership,
  Payment,
  ReminderMail,
  Schedule,
  SelectedCalendar,
  Team,
  User,
  Webhook,
} from "@calcom/prisma/client";

// Base response, used for all responses
export type BaseResponse = {
  message?: string;
  error?: Error;
};

// User
export type UserResponse = BaseResponse & {
  user?: Partial<User>;
};

export type UsersResponse = BaseResponse & {
  users?: Partial<User>[];
};

// Team
export type TeamResponse = BaseResponse & {
  team?: Partial<Team>;
  owner?: Partial<Membership>;
};
export type TeamsResponse = BaseResponse & {
  teams?: Partial<Team>[];
};

// SelectedCalendar
export type SelectedCalendarResponse = BaseResponse & {
  selected_calendar?: Partial<SelectedCalendar>;
};
export type SelectedCalendarsResponse = BaseResponse & {
  selected_calendars?: Partial<SelectedCalendar>[];
};

// Attendee
export type AttendeeResponse = BaseResponse & {
  attendee?: Partial<Attendee>;
};
// Grouping attendees in booking arrays for now,
// later might remove endpoint and move to booking endpoint altogether.
export type AttendeesResponse = BaseResponse & {
  attendees?: Partial<Attendee>[];
};

// Availability
export type AvailabilityResponse = BaseResponse & {
  availability?: Partial<Availability>;
};
export type AvailabilitiesResponse = BaseResponse & {
  availabilities?: Partial<Availability>[];
};

// BookingReference
export type BookingReferenceResponse = BaseResponse & {
  booking_reference?: Partial<BookingReference>;
};
export type BookingReferencesResponse = BaseResponse & {
  booking_references?: Partial<BookingReference>[];
};

// Booking
export type BookingResponse = BaseResponse & {
  booking?: Partial<Booking>;
};
export type BookingsResponse = BaseResponse & {
  bookings?: Partial<Booking>[];
};

// Credential
export type CredentialResponse = BaseResponse & {
  credential?: Partial<Credential>;
};
export type CredentialsResponse = BaseResponse & {
  credentials?: Partial<Credential>[];
};

// DestinationCalendar
export type DestinationCalendarResponse = BaseResponse & {
  destination_calendar?: Partial<DestinationCalendar>;
};
export type DestinationCalendarsResponse = BaseResponse & {
  destination_calendars?: Partial<DestinationCalendar>[];
};

// Membership
export type MembershipResponse = BaseResponse & {
  membership?: Partial<Membership>;
};
export type MembershipsResponse = BaseResponse & {
  memberships?: Partial<Membership>[];
};

// EventTypeCustomInput
export type EventTypeCustomInputResponse = BaseResponse & {
  event_type_custom_input?: Partial<EventTypeCustomInput>;
};
export type EventTypeCustomInputsResponse = BaseResponse & {
  event_type_custom_inputs?: Partial<EventTypeCustomInput>[];
};
// From rrule https://jakubroztocil.github.io/rrule freq
export enum Frequency {
  YEARLY,
  MONTHLY,
  WEEKLY,
  DAILY,
  HOURLY,
  MINUTELY,
  SECONDLY,
}
interface EventTypeExtended extends Omit<EventType, "recurringEvent" | "locations"> {
  recurringEvent: {
    dtstart?: Date | undefined;
    interval?: number | undefined;
    count?: number | undefined;
    freq?: Frequency | undefined;
    until?: Date | undefined;
    tzid?: string | undefined;
  } | null;
  locations:
    | {
        link?: string | undefined;
        address?: string | undefined;
        hostPhoneNumber?: string | undefined;
        type: EventLocationType;
      }[]
    | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | any;
}

// EventType
export type EventTypeResponse = BaseResponse & {
  event_type?: Partial<EventType | EventTypeExtended>;
};
export type EventTypesResponse = BaseResponse & {
  event_types?: Partial<EventType | EventTypeExtended>[];
};

// Payment
export type PaymentResponse = BaseResponse & {
  payment?: Partial<Payment>;
};
export type PaymentsResponse = BaseResponse & {
  payments?: Partial<Payment>[];
};

// Schedule
export type ScheduleResponse = BaseResponse & {
  schedule?: Partial<Schedule>;
};
export type SchedulesResponse = BaseResponse & {
  schedules?: Partial<Schedule>[];
};

// Webhook
export type WebhookResponse = BaseResponse & {
  webhook?: Partial<Webhook> | null;
};
export type WebhooksResponse = BaseResponse & {
  webhooks?: Partial<Webhook>[];
};

// ReminderMail
export type ReminderMailResponse = BaseResponse & {
  reminder_mail?: Partial<ReminderMail>;
};
export type ReminderMailsResponse = BaseResponse & {
  reminder_mails?: Partial<ReminderMail>[];
};
