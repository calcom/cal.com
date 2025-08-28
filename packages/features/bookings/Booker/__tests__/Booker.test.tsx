import "@calcom/features/bookings/Booker/__mocks__/config";
import "@calcom/features/bookings/Booker/components/OverlayCalendar/__mocks__/OverlayCalendar";
import "@calcom/features/bookings/Booker/components/__mocks__/AvailableTimeSlots";
import "@calcom/features/bookings/Booker/components/__mocks__/DatePicker";
import "@calcom/features/bookings/Booker/components/__mocks__/DryRunMessage";
import "@calcom/features/bookings/Booker/components/__mocks__/EventMeta";
import "@calcom/features/bookings/Booker/components/__mocks__/Header";
import "@calcom/features/bookings/Booker/components/__mocks__/LargeCalendar";
import "@calcom/features/bookings/Booker/components/__mocks__/Section";
import { constantsScenarios } from "@calcom/lib/__mocks__/constants";
import "@calcom/lib/__mocks__/logger";

import React from "react";
import { vi } from "vitest";

import "@calcom/dayjs/__mocks__";
import "@calcom/features/auth/Turnstile";

import { Booker } from "../Booker";
import { render, screen } from "./test-utils";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
  };
});

// Mock components that we don't want to test
vi.mock("../components/BookEventForm", () => ({
  BookEventForm: ({
    isTimeslotUnavailable,
    onCancel,
  }: {
    isTimeslotUnavailable: boolean;
    onCancel: () => void;
  }) => {
    console.log("BookEventForm Called", { isTimeslotUnavailable, onCancel });
    return (
      <div data-testid="book-event-form" data-unavailable={isTimeslotUnavailable}>
        Mock Book Event Form
        <button onClick={onCancel}>cancel</button>
      </div>
    );
  },
}));

vi.mock("../components/BookEventForm/BookFormAsModal", () => ({
  BookFormAsModal: () => {
    return <div data-testid="book-form-as-modal">Mock Book Form As Modal</div>;
  },
}));

const mockEvent = {
  data: {
    id: 1,
    title: "Test Event",
    seatsPerTimeSlot: 1,
    seatsShowAvailabilityCount: true,
  },
  isSuccess: true,
  isPending: false,
};

vi.mock("../../../calendars/NoAvailabilityDialog", () => ({
  default: () => {
    return null;
  },
}));

const mockSchedule = {
  data: {
    slots: {
      "2024-01-01": [{ time: "2024-01-01T10:00:00Z" }, { time: "2024-01-01T11:00:00Z" }],
    },
  },
  isPending: false,
  invalidate: vi.fn(),
};

vi.mock("@calcom/atoms/hooks/useIsPlatformBookerEmbed", () => ({
  useIsPlatformBookerEmbed: () => false,
}));

vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: () => false,
}));

// Update defaultProps to include missing required props
const defaultProps = {
  username: "testuser",
  eventSlug: "test-event",
  entity: { considerUnpublished: false },
  event: mockEvent,
  schedule: mockSchedule,
  slots: {
    selectedTimeslot: "2024-01-01T10:00:00Z",
    setSelectedTimeslot: vi.fn(),
    allSelectedTimeslots: ["2024-01-01T10:00:00Z"],
    quickAvailabilityChecks: [],
  },
  bookerForm: {
    key: "form-key",
    bookerFormErrorRef: { current: null },
    formEmail: "",
    bookingForm: {
      watch: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn().mockReturnValue({ responses: {} }),
    },
    errors: {},
  },
  bookings: {
    handleBookEvent: vi.fn(),
    errors: {},
    loadingStates: {},
    expiryTime: 0,
    instantVideoMeetingUrl: "",
  },
  verifyEmail: {
    isEmailVerificationModalVisible: false,
    setEmailVerificationModalVisible: vi.fn(),
    handleVerifyEmail: vi.fn(),
    renderConfirmNotVerifyEmailButtonCond: true,
    isVerificationCodeSending: false,
  },
  calendars: {
    overlayBusyDates: [],
    isOverlayCalendarEnabled: false,
    connectedCalendars: [],
    loadingConnectedCalendar: false,
    onToggleCalendar: vi.fn(),
  },
  bookerLayout: {
    shouldShowFormInDialog: false,
    extraDays: 7,
    columnViewExtraDays: { current: 7 },
    isMobile: false,
    layout: "MONTH_VIEW",
    hideEventTypeDetails: false,
    isEmbed: false,
    bookerLayouts: { enabledLayouts: [] },
    hasDarkBackground: false,
  },
  verifyCode: null,
  isPlatform: false,
  orgBannerUrl: null,
  customClassNames: {},
  areInstantMeetingParametersSet: false,
  userLocale: "en",
  hasValidLicense: true,
  isBookingDryRun: false,
  renderCaptcha: false,
  onConnectNowInstantMeeting: vi.fn(),
  onGoBackInstantMeeting: vi.fn(),
  onOverlayClickNoCalendar: vi.fn(),
  onClickOverlayContinue: vi.fn(),
  onOverlaySwitchStateChange: vi.fn(),
  extraOptions: {},
  sessionUsername: null,
  rescheduleUid: null,
  hasSession: false,
  isInstantMeeting: false,
};

describe("Booker", () => {
  beforeEach(() => {
    constantsScenarios.set({
      PUBLIC_QUICK_AVAILABILITY_ROLLOUT: "100",
      POWERED_BY_URL: "https://go.cal.com/booking",
      APP_NAME: "Cal.com",
    });
    vi.clearAllMocks();
  });

  it("should render null when in loading state", () => {
    const { container } = render(<Booker {...defaultProps} />, {
      mockStore: { state: "loading" },
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("should render DryRunMessage when in dry run mode", () => {
    const propsWithDryRun = {
      ...defaultProps,
      isBookingDryRun: true,
      event: {
        ...mockEvent,
        data: {
          ...mockEvent.data,
          isDynamic: false,
        },
      },
    };

    render(<Booker {...propsWithDryRun} />, {
      mockStore: {
        state: "selecting_time",
        selectedDate: "2024-01-01",
        selectedTimeslot: "2024-01-01T10:00:00Z",
        tentativeSelectedTimeslots: ["2024-01-01T10:00:00Z"],
      },
    });
    expect(screen.getByTestId("dry-run-message")).toBeInTheDocument();
  });

  it("should invalidate schedule when cancelling booking form", () => {
    const mockInvalidate = vi.fn();
    constantsScenarios.set({
      PUBLIC_INVALIDATE_AVAILABLE_SLOTS_ON_BOOKING_FORM: "true",
    });
    const propsWithInvalidate = {
      ...defaultProps,
      schedule: {
        ...mockSchedule,
        invalidate: mockInvalidate,
      },
    };

    render(<Booker {...propsWithInvalidate} />, {
      mockStore: { state: "booking" },
    });
    screen.logTestingPlaygroundURL();
    // Trigger form cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    cancelButton.click();

    expect(mockInvalidate).toHaveBeenCalled();
    expect(defaultProps.slots.setSelectedTimeslot).toHaveBeenCalledWith(null);
  });

  describe("Schedule and Availability Check", () => {
    it("should mark timeslot as unavailable based on quick availability checks", async () => {
      const propsWithQuickChecks = {
        ...defaultProps,
        slots: {
          ...defaultProps.slots,
          quickAvailabilityChecks: [{ utcStartIso: "2024-01-01T10:00:00Z", status: "unavailable" }],
        },
      };

      render(<Booker {...propsWithQuickChecks} />, {
        mockStore: { state: "booking" },
      });
      const bookEventForm = screen.getByTestId("book-event-form");
      await expect(bookEventForm).toHaveAttribute("data-unavailable", "true");
    });
  });
});
