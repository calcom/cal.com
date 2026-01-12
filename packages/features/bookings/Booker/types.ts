import type React from "react";
import type { UseFormReturn } from "react-hook-form";

import type { BookerEventQuery } from "@calcom/features/bookings/types";
import type { IntlSupportedTimeZones } from "@calcom/lib/timeZones";
import type { BookerLayouts } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";

import type { GetBookingType } from "../lib/get-booking";

export type UseBookerLayoutType = {
  shouldShowFormInDialog: boolean;
  hasDarkBackground: boolean | undefined;
  extraDays: number;
  columnViewExtraDays: React.MutableRefObject<number>;
  isMobile: boolean;
  isEmbed: boolean | undefined;
  isTablet: boolean;
  layout: BookerLayout;
  defaultLayout: BookerLayouts;
  hideEventTypeDetails: boolean;
  bookerLayouts: {
    enabledLayouts: BookerLayouts[];
    defaultLayout: BookerLayouts;
  };
};

export type UseBookingFormReturnType = {
  bookingForm: UseFormReturn<{
    locationType?: string;
    responses: Record<string, unknown> | null;
    globalError: undefined;
    cfToken?: string;
  }>;
  bookerFormErrorRef: React.RefObject<HTMLDivElement>;
  key: string;
  formEmail: string | undefined;
  formName: string | { firstName: string; lastName?: string } | undefined;
  beforeVerifyEmail: () => void;
  formErrors: {
    hasFormErrors: boolean;
    formErrors: unknown;
  };
  errors: {
    hasFormErrors: boolean;
    formErrors: unknown;
  };
};

export type UseBookingsReturnType = {
  handleBookEvent: () => void;
  expiryTime: Date | undefined;
  bookingForm: UseBookingFormReturnType["bookingForm"];
  bookerFormErrorRef: React.RefObject<HTMLDivElement>;
  errors: {
    hasDataErrors: boolean;
    dataErrors: unknown;
  };
  loadingStates: {
    creatingBooking: boolean;
    creatingRecurringBooking: boolean;
    creatingInstantBooking: boolean;
  };
  instantVideoMeetingUrl: string | undefined;
  instantConnectCooldownMs: number;
};

export type UseCalendarsReturnType = {
  overlayBusyDates:
    | {
        start: string | Date;
        end: string | Date;
      }[]
    | undefined;
  isOverlayCalendarEnabled: boolean;
  connectedCalendars: RouterOutputs["viewer"]["calendars"]["connectedCalendars"]["connectedCalendars"];
  loadingConnectedCalendar: boolean;
  onToggleCalendar: (
    data: Set<{
      credentialId: number;
      externalId: string;
    }>
  ) => void;
};

export type QuickAvailabilityCheck = {
  utcStartIso: string;
  utcEndIso: string;
  status: "available" | "reserved" | "minBookNoticeViolation" | "slotInPast";
  realStatus?: "available" | "reserved" | "minBookNoticeViolation" | "slotInPast";
};

export type UseSlotsReturnType = {
  setSelectedTimeslot: (timeslot: string | null) => void;
  setTentativeSelectedTimeslots: (timeslots: string[]) => void;
  selectedTimeslot: string | null;
  tentativeSelectedTimeslots: string[];
  slotReservationId: string | null;
  allSelectedTimeslots: string[];
  quickAvailabilityChecks: QuickAvailabilityCheck[];
};

export type UseVerifyCodeReturnType = {
  verifyCodeWithSessionRequired: (code: string, email: string) => void;
  verifyCodeWithSessionNotRequired: (code: string, email: string) => void;
  isPending: boolean;
  setIsPending: React.Dispatch<React.SetStateAction<boolean>>;
  error: string;
  value: string;
  hasVerified: boolean;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  setHasVerified: React.Dispatch<React.SetStateAction<boolean>>;
  resetErrors: () => void;
};

export type UseVerifyEmailReturnType = {
  handleVerifyEmail: () => void;
  isEmailVerificationModalVisible: boolean;
  setEmailVerificationModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setVerifiedEmail: (email: string | null) => void;
  renderConfirmNotVerifyEmailButtonCond: boolean;
  isVerificationCodeSending: boolean;
};

export interface IUseBookingLoadingStates {
  creatingBooking: boolean;
  creatingRecurringBooking: boolean;
  creatingInstantBooking: boolean;
}

export interface IUseBookingErrors {
  hasDataErrors: boolean;
  dataErrors: unknown;
}

export type useScheduleForEventReturnType = {
  data: RouterOutputs["viewer"]["slots"]["getSchedule"] | undefined;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  isLoading: boolean;
  invalidate: () => Promise<any>;
  dataUpdatedAt: number;
};

export type Timezone = (typeof IntlSupportedTimeZones)[number];

export interface BookerProps {
  eventSlug: string;
  username: string;
  orgBannerUrl?: string | null;

  /*
    all custom classnames related to booker styling go here
  */
  customClassNames?: CustomClassNames;

  /**
   * Custom React components to render at the bottom of the EventMeta component
   */
  eventMetaChildren?: React.ReactNode;

  /**
   * Whether is a team or org, we gather basic info from both
   */
  entity: {
    fromRedirectOfNonOrgLink?: boolean;
    considerUnpublished: boolean;
    isUnpublished?: boolean;
    orgSlug?: string | null;
    teamSlug?: string | null;
    name?: string | null;
    logoUrl?: string | null;
    eventTypeId?: number | null;
  };

  /**
   * If month is NOT set as a prop on the component, we expect a query parameter
   * called `month` to be present on the url. If that is missing, the component will
   * default to the current month.
   * @note In case you're using a client side router, please pass the value in as a prop,
   * since the component will leverage window.location, which might not have the query param yet.
   * @format YYYY-MM.
   * @optional
   */
  month?: string;
  /**
   * Default selected date for with the slotpicker will already open.
   * @optional
   */
  selectedDate?: Date;

  hideBranding?: boolean;
  /**
   * If false and the current username indicates a dynamic booking,
   * the Booker will immediately show an error.
   * This is NOT revalidated by calling the API.
   */
  allowsDynamicBooking?: boolean;
  /**
   * When rescheduling a booking, the current' bookings data is passed in via this prop.
   * The component itself won't fetch booking data based on the ID, since there is not public
   * api to fetch this data. Therefore rescheduling a booking currently is not possible
   * within the atom (i.e. without a server side component).
   */
  bookingData?: GetBookingType;
  /**
   * If this boolean is passed, we will only check team events with this slug and event slug.
   * If it's not passed, we will first query a generic user event, and only if that doesn't exist
   * fetch the team event. In case there's both a team + user with the same slug AND same event slug,
   * that will always result in the user event being returned.
   */
  isTeamEvent?: boolean;
  /**
   * Refers to a multiple-duration event-type
   * It will correspond to selected time from duration query param if exists and if it is allowed as an option,
   * otherwise, the default value is selected
   */
  duration?: number | null;
  /**
   * Configures the selectable options for a multiDuration event type.
   */
  durationConfig?: number[];
  /**
   * Refers to the private link from event types page.
   */
  hashedLink?: string | null;
  isInstantMeeting?: boolean;
  teamMemberEmail?: string | null;
  showNoAvailabilityDialog?: boolean;
  crmOwnerRecordType?: string | null;
  crmAppSlug?: string | null;
  crmRecordId?: string | null;
  areInstantMeetingParametersSet?: boolean | null;
  userLocale?: string | null;
  hasValidLicense?: boolean;
  useApiV2?: boolean;
}

export type WrappedBookerPropsMain = {
  sessionUsername?: string | null;
  rescheduleUid: string | null;
  rescheduledBy: string | null;
  bookingUid: string | null;
  isRedirect: boolean;
  fromUserNameRedirected: string;
  hasSession: boolean;
  onGoBackInstantMeeting: () => void;
  onConnectNowInstantMeeting: () => void;
  onOverlayClickNoCalendar: () => void;
  onClickOverlayContinue: () => void;
  onOverlaySwitchStateChange: (state: boolean) => void;
  extraOptions: Record<string, string | string[]>;
  bookings: UseBookingsReturnType;
  slots: UseSlotsReturnType;
  calendars: UseCalendarsReturnType;
  bookerForm: UseBookingFormReturnType;
  event: BookerEventQuery;
  schedule: useScheduleForEventReturnType;
  bookerLayout: UseBookerLayoutType;
  verifyEmail: UseVerifyEmailReturnType;
  customClassNames?: CustomClassNames;
  isBookingDryRun?: boolean;
  renderCaptcha?: boolean;
  confirmButtonDisabled?: boolean;
};

export type WrappedBookerPropsForPlatform = WrappedBookerPropsMain & {
  isPlatform: true;
  verifyCode: undefined;
  customClassNames?: CustomClassNames;
  timeZones?: Timezone[];
  roundRobinHideOrgAndTeam?: boolean;
};
export type WrappedBookerPropsForWeb = WrappedBookerPropsMain & {
  isPlatform: false;
  verifyCode: UseVerifyCodeReturnType;
  timeZones?: Timezone[];
  roundRobinHideOrgAndTeam?: boolean;
};

export type WrappedBookerProps = WrappedBookerPropsForPlatform | WrappedBookerPropsForWeb;
export type VIEW_TYPE = "MONTH_VIEW" | "WEEK_VIEW" | "COLUMN_VIEW";

export type BookerState = "loading" | "selecting_date" | "selecting_time" | "booking";
export type BookerLayout = "month_view" | "week_view" | "column_view" | "mobile";
export type BookerAreas = "calendar" | "timeslots" | "main" | "meta" | "header";

export type CustomClassNames = {
  bookerWrapper?: string;
  bookerContainer?: string;
  eventMetaCustomClassNames?: {
    eventMetaContainer?: string;
    eventMetaTitle?: string;
    eventMetaTimezoneSelect?: string;
    eventMetaChildren?: string;
  };
  datePickerCustomClassNames?: DatePickerClassNames;
  availableTimeSlotsCustomClassNames?: {
    availableTimeSlotsContainer?: string;
    availableTimeSlotsHeaderContainer?: string;
    availableTimeSlotsTitle?: string;
    availableTimeSlotsTimeFormatToggle?: string;
    availableTimes?: string;
  };
  atomsWrapper?: string;
  confirmStep?: {
    confirmButton?: string;
    backButton?: string;
  };
};

export type DatePickerClassNames = {
  datePickerContainer?: string;
  datePickerTitle?: string;
  datePickerDays?: string;
  datePickerDate?: string;
  datePickerDatesActive?: string;
  datePickerToggle?: string;
};
