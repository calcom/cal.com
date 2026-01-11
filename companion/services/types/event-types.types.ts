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

  // Metadata
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
}

export interface GetEventTypesResponse {
  status: "success";
  data: EventType[];
}
