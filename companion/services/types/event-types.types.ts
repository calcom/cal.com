// Event Type Creation/Update Types
export interface BookingLimitsCount {
  day?: number;
  week?: number;
  month?: number;
  year?: number;
}

export interface BookingLimitsDuration {
  day?: number;
  week?: number;
  month?: number;
  year?: number;
}

export interface BookerActiveBookingsLimit {
  count: number;
}

export interface BusinessDaysWindow {
  type: "businessDays";
  value: number;
  rolling?: boolean;
  rollingWindow?: number;
}

export interface CalendarDaysWindow {
  type: "calendarDays";
  value: number;
  rolling?: boolean;
  rollingWindow?: number;
}

export interface RangeWindow {
  type: "range";
  value: [string, string]; // ISO date strings
}

export type BookingWindow =
  | BusinessDaysWindow
  | CalendarDaysWindow
  | RangeWindow
  | { disabled: true };

export interface BookerLayouts {
  enabledLayouts: Array<"month_view" | "week_view" | "column_view">;
  defaultLayout: "month_view" | "week_view" | "column_view";
}

export interface ConfirmationPolicy {
  type?: "always";
  noticeThreshold?: {
    count: number;
    unit: "hours" | "minutes";
  };
}

export interface Recurrence {
  interval: number;
  occurrences: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
}

export interface Seats {
  seatsPerTimeSlot?: number;
  showAttendeeInfo?: boolean;
  showAvailabilityCount?: boolean;
  seatsShowAvailabilityCount?: boolean;
}

export interface EventTypeColor {
  lightEventTypeColor?: string;
  darkEventTypeColor?: string;
}

export interface EmailSettings {
  additionalGuestsEmails?: string[];
}

// Disable Cancelling settings (API V2 format)
export interface DisableCancelling {
  disabled: boolean;
}

// Disable Rescheduling settings (API V2 format)
export interface DisableRescheduling {
  disabled: boolean;
  minutesBefore?: number; // Optional: disable when less than X minutes before
}

// Cal Video Settings
export interface CalVideoSettings {
  disableRecordingForOrganizer?: boolean;
  disableRecordingForGuests?: boolean;
  redirectUrlOnExit?: string;
  enableAutomaticRecordingForOrganizer?: boolean;
  enableAutomaticTranscription?: boolean;
  disableTranscriptionForGuests?: boolean;
  disableTranscriptionForOrganizer?: boolean;
  sendTranscriptionEmails?: boolean;
}

// Booking Field Types
export interface BaseBookingField {
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  hidden?: boolean;
}

export interface NameDefaultField extends BaseBookingField {
  type: "name";
  variant?: "fullName" | "firstAndLastName";
}

export interface EmailDefaultField extends BaseBookingField {
  type: "email";
}

export interface PhoneField extends BaseBookingField {
  type: "phone";
}

export interface AddressField extends BaseBookingField {
  type: "address";
}

export interface TextField extends BaseBookingField {
  type: "text";
}

export interface NumberField extends BaseBookingField {
  type: "number";
}

export interface TextAreaField extends BaseBookingField {
  type: "textarea";
}

export interface SelectField extends BaseBookingField {
  type: "select" | "multiselect";
  options?: Array<{ label: string; value: string }>;
}

export interface CheckboxField extends BaseBookingField {
  type: "checkbox";
}

export interface RadioField extends BaseBookingField {
  type: "radio" | "radioInput";
  options?: Array<{ label: string; value: string }>;
}

export interface BooleanField extends BaseBookingField {
  type: "boolean";
}

export type BookingField =
  | NameDefaultField
  | EmailDefaultField
  | PhoneField
  | AddressField
  | TextField
  | NumberField
  | TextAreaField
  | SelectField
  | CheckboxField
  | RadioField
  | BooleanField;

export interface EventType {
  id: number;
  title: string;
  slug: string;
  description?: string;
  length: number; // Deprecated: use lengthInMinutes instead
  lengthInMinutes?: number; // API returns this field
  lengthInMinutesOptions?: number[];

  // Locations
  locations?: Array<{
    type: string;
    address?: string;
    link?: string;
    phone?: string;
    integration?: string;
    credentialId?: number;
    public?: boolean;
  }>;

  // Pricing
  price?: number;
  currency?: string;

  // Basic settings
  disableGuests?: boolean;
  lockTimeZoneToggleOnBookingPage?: boolean;
  requiresConfirmation?: boolean;
  requiresBookerEmailVerification?: boolean;
  hideCalendarNotes?: boolean;
  successRedirectUrl?: string;
  forwardParamsSuccessRedirect?: boolean;

  // Schedule and buffers
  scheduleId?: number;
  slotInterval?: number;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;

  // Limits
  bookingLimitsCount?: BookingLimitsCount | { disabled: true };
  bookingLimitsDuration?: BookingLimitsDuration | { disabled: true };
  bookerActiveBookingsLimit?: BookerActiveBookingsLimit | { disabled: true };
  onlyShowFirstAvailableSlot?: boolean;
  bookingWindow?: BookingWindow;
  offsetStart?: number;

  // Advanced
  bookerLayouts?: BookerLayouts;
  confirmationPolicy?: ConfirmationPolicy | { disabled: true };

  // Recurring
  recurrence?: Recurrence | { disabled: true };

  // Seats
  seats?: Seats | { disabled: true };

  // Customization
  bookingFields?: BookingField[];
  hidden?: boolean;
  eventTypeColor?: EventTypeColor;

  // Ownership
  userId?: number;
  teamId?: number;
  hosts?: Array<{
    userId: number;
    isFixed: boolean;
  }>;
  users?: Array<{
    id: number;
    name?: string;
    username?: string;
    avatarUrl?: string;
    brandColor?: string | null;
    darkBrandColor?: string | null;
    weekStart?: string;
    metadata?: Record<string, unknown>;
  }>;

  // Metadata
  metadata?: Record<string, unknown>;

  // Booking action settings (API V2 format)
  disableRescheduling?: DisableRescheduling;
  disableCancelling?: DisableCancelling;
  minimumRescheduleNotice?: number;
  allowReschedulingPastBookings?: boolean;
  allowReschedulingCancelledBookings?: boolean;

  // Additional properties from API responses
  hideCalendarEventDetails?: boolean;
  hideOrganizerEmail?: boolean;
  customReplyToEmail?: string;
  color?: {
    lightThemeHex?: string;
    darkThemeHex?: string;
  };

  // Cal Video Settings
  calVideoSettings?: CalVideoSettings;

  // Interface language (API V2)
  interfaceLanguage?: string;

  // Optimized slots (API V2)
  showOptimizedSlots?: boolean;

  // Booking URL (API V2) - full booking URL for this event type
  bookingUrl?: string;
}

export interface CreateEventTypeInput {
  // Basic fields
  title: string;
  slug: string;
  description?: string;
  lengthInMinutes: number;
  lengthInMinutesOptions?: number[];

  // Locations
  locations?: Array<{
    type: string;
    address?: string;
    link?: string;
    phone?: string;
    integration?: string;
    credentialId?: number;
    public?: boolean;
  }>;

  // Schedule
  scheduleId?: number;

  // Booking settings
  disableGuests?: boolean;
  slotInterval?: number;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;

  // Limits
  bookingLimitsCount?: BookingLimitsCount | { disabled: true };
  bookingLimitsDuration?: BookingLimitsDuration | { disabled: true };
  bookerActiveBookingsLimit?: BookerActiveBookingsLimit | { disabled: true };
  onlyShowFirstAvailableSlot?: boolean;

  // Booking window
  bookingWindow?: BookingWindow;

  // Advanced settings
  offsetStart?: number;
  bookerLayouts?: BookerLayouts;
  confirmationPolicy?: ConfirmationPolicy | { disabled: true };
  recurrence?: Recurrence | { disabled: true };
  seats?: Seats | { disabled: true };

  // Customization
  bookingFields?: BookingField[];
  hidden?: boolean;
  eventTypeColor?: EventTypeColor;
  emailSettings?: EmailSettings;

  // Additional fields
  requiresConfirmation?: boolean;
  requiresBookerEmailVerification?: boolean;
  hideCalendarNotes?: boolean;
  lockTimeZoneToggleOnBookingPage?: boolean;
  successRedirectUrl?: string;
  forwardParamsSuccessRedirect?: boolean;
  metadata?: Record<string, unknown>;

  // API V2 new fields
  disableCancelling?: DisableCancelling;
  disableRescheduling?: DisableRescheduling;
  calVideoSettings?: CalVideoSettings;
  interfaceLanguage?: string;
  showOptimizedSlots?: boolean;
}

export interface GetEventTypesResponse {
  status: "success";
  data: EventType[];
}
