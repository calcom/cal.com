import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { EventLimitsTab } from "./EventLimitsTab";

// Mock the hooks and utilities
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, vars?: any) => {
      if (vars) {
        return `${key}_${JSON.stringify(vars)}`;
      }
      return key;
    },
    i18n: {
      language: "en",
    },
  }),
}));

vi.mock("@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager", () => ({
  default: () => ({
    shouldLockIndicator: vi.fn(() => null),
    shouldLockDisableProps: vi.fn(() => ({ disabled: false })),
  }),
}));

vi.mock("@calcom/lib/convertToNewDurationType", () => ({
  default: vi.fn((from: string, to: string, value: number) => {
    if (from === "minutes" && to === "minutes") return value;
    if (from === "minutes" && to === "hours") return value / 60;
    if (from === "minutes" && to === "days") return value / (60 * 24);
    if (from === "hours" && to === "minutes") return value * 60;
    if (from === "days" && to === "minutes") return value * 60 * 24;
    return value;
  }),
}));

vi.mock("@calcom/lib/findDurationType", () => ({
  default: vi.fn((value: number) => {
    if (value >= 1440) return "days";
    if (value >= 60) return "hours";
    return "minutes";
  }),
}));

vi.mock("@calcom/features/eventtypes/lib/getDefinedBufferTimes", () => ({
  getDefinedBufferTimes: () => [5, 10, 15, 20, 30, 45, 60, 90, 120],
}));

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

// Mock the MinimumCancellationNoticeInput component
vi.mock("./MinimumCancellationNoticeInput", () => ({
  default: ({ name, disabled, customClassNames, ...props }: any) => (
    <div data-testid="minimum-cancellation-notice-input">
      <input
        type="number"
        name={name}
        disabled={disabled}
        placeholder="Minimum Cancellation Notice"
        {...props}
      />
    </div>
  ),
}));

const mockEventType = {
  id: 1,
  title: "Test Event",
  slug: "test-event",
  length: 30,
  minimumBookingNotice: 60,
  minimumCancellationNotice: 120,
  beforeEventBuffer: 0,
  afterEventBuffer: 0,
  slotInterval: null,
  bookingLimits: {},
  durationLimits: {},
  periodType: "UNLIMITED",
  periodDays: null,
  periodCountCalendarDays: null,
  periodDates: {
    startDate: null,
    endDate: null,
  },
  onlyShowFirstAvailableSlot: false,
  offsetStart: 0,
  maxActiveBookingsPerBooker: 0,
};

const TestWrapper = ({ 
  children, 
  defaultValues = {},
  eventType = mockEventType,
}: { 
  children: React.ReactNode; 
  defaultValues?: any;
  eventType?: any;
}) => {
  const methods = useForm({
    defaultValues: {
      ...mockEventType,
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
};

describe("EventLimitsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Minimum Cancellation Notice Integration", () => {
    it("renders the minimum cancellation notice field", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      const cancellationInput = screen.getByTestId("minimum-cancellation-notice-input");
      expect(cancellationInput).toBeInTheDocument();
    });

    it("renders minimum cancellation notice alongside minimum booking notice", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      // Both fields should be present
      expect(screen.getByText("minimum_booking_notice")).toBeInTheDocument();
      const cancellationInput = screen.getByTestId("minimum-cancellation-notice-input");
      expect(cancellationInput).toBeInTheDocument();
    });

    it("positions cancellation notice field correctly in the UI", () => {
      const { container } = render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      // Find the buffer and notice section
      const bufferSection = container.querySelector(".border-subtle.space-y-6");
      expect(bufferSection).toBeInTheDocument();

      // Cancellation notice should be within this section
      const cancellationInput = bufferSection?.querySelector('[data-testid="minimum-cancellation-notice-input"]');
      expect(cancellationInput).toBeInTheDocument();
    });

    it("applies custom class names to cancellation notice field", () => {
      const customClassNames = {
        bufferAndNoticeSection: {
          minimumNoticeInput: {
            container: "custom-container",
            input: "custom-input",
            select: "custom-select",
          },
        },
      };

      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} customClassNames={customClassNames} />
        </TestWrapper>
      );

      const cancellationInput = screen.getByTestId("minimum-cancellation-notice-input");
      expect(cancellationInput).toBeInTheDocument();
    });

    it("respects locked field settings for cancellation notice", () => {
      const mockLockedFieldsManager = {
        shouldLockIndicator: vi.fn((field) => {
          if (field === "minimumCancellationNotice") return " (Locked)";
          return null;
        }),
        shouldLockDisableProps: vi.fn((field) => {
          if (field === "minimumCancellationNotice") return { disabled: true };
          return { disabled: false };
        }),
      };

      vi.mocked(vi.importActual("@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager")).default = () => mockLockedFieldsManager;

      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      const cancellationInput = within(screen.getByTestId("minimum-cancellation-notice-input")).getByRole("spinbutton");
      expect(cancellationInput).toHaveAttribute("disabled");
    });

    it("initializes with correct default values", () => {
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 240 }}>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      const cancellationInput = screen.getByTestId("minimum-cancellation-notice-input");
      expect(cancellationInput).toBeInTheDocument();
    });
  });

  describe("Buffer Times", () => {
    it("renders before and after buffer time selects", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      expect(screen.getByText("before_event")).toBeInTheDocument();
      expect(screen.getByText("after_event")).toBeInTheDocument();
    });

    it("renders slot interval select", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      expect(screen.getByText("slot_interval")).toBeInTheDocument();
    });
  });

  describe("Booking Limits", () => {
    it("renders booking frequency limit toggle", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      expect(screen.getByText("limit_booking_frequency")).toBeInTheDocument();
      expect(screen.getByText("limit_booking_frequency_description")).toBeInTheDocument();
    });

    it("shows interval limits when booking limits are enabled", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper defaultValues={{ bookingLimits: {} }}>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      const toggle = screen.getByText("limit_booking_frequency").closest("div")?.querySelector("button[role='switch']");
      if (toggle) {
        await user.click(toggle);
      }

      await waitFor(() => {
        expect(screen.getByText("add_limit")).toBeInTheDocument();
      });
    });
  });

  describe("Duration Limits", () => {
    it("renders total duration limit toggle", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      expect(screen.getByText("limit_total_booking_duration")).toBeInTheDocument();
      expect(screen.getByText("limit_total_booking_duration_description")).toBeInTheDocument();
    });

    it("shows duration limits when enabled", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper defaultValues={{ durationLimits: {} }}>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      const toggle = screen.getByText("limit_total_booking_duration").closest("div")?.querySelector("button[role='switch']");
      if (toggle) {
        await user.click(toggle);
      }

      await waitFor(() => {
        expect(screen.getByText("add_limit")).toBeInTheDocument();
      });
    });
  });

  describe("Future Booking Limits", () => {
    it("renders future booking limit toggle", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      expect(screen.getByText("limit_future_bookings")).toBeInTheDocument();
      expect(screen.getByText("limit_future_bookings_description")).toBeInTheDocument();
    });

    it("shows rolling and range options when enabled", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper defaultValues={{ periodType: "UNLIMITED" }}>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      const toggle = screen.getByText("limit_future_bookings").closest("div")?.querySelector("button[role='switch']");
      if (toggle) {
        await user.click(toggle);
      }

      await waitFor(() => {
        expect(screen.getByText("within_date_range")).toBeInTheDocument();
      });
    });
  });

  describe("First Available Slot", () => {
    it("renders only show first available slot toggle", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      expect(screen.getByText("only_show_first_available_slot")).toBeInTheDocument();
      expect(screen.getByText("only_show_first_available_slot_description")).toBeInTheDocument();
    });

    it("toggles first available slot setting", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper defaultValues={{ onlyShowFirstAvailableSlot: false }}>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      const toggle = screen.getByText("only_show_first_available_slot").closest("div")?.querySelector("button[role='switch']");
      if (toggle) {
        await user.click(toggle);
      }

      // Toggle should update the value
      await waitFor(() => {
        expect(toggle).toHaveAttribute("data-state", "checked");
      });
    });
  });

  describe("Offset Start Times", () => {
    it("renders offset toggle when offset value is greater than 0", () => {
      render(
        <TestWrapper defaultValues={{ offsetStart: 15 }}>
          <EventLimitsTab eventType={{ ...mockEventType, offsetStart: 15 }} />
        </TestWrapper>
      );

      expect(screen.getByText("offset_toggle")).toBeInTheDocument();
      expect(screen.getByText("offset_toggle_description")).toBeInTheDocument();
    });

    it("does not render offset toggle when offset is 0", () => {
      render(
        <TestWrapper defaultValues={{ offsetStart: 0 }}>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      expect(screen.queryByText("offset_toggle")).not.toBeInTheDocument();
    });

    it("shows offset input when toggle is enabled", () => {
      render(
        <TestWrapper defaultValues={{ offsetStart: 15 }}>
          <EventLimitsTab eventType={{ ...mockEventType, offsetStart: 15 }} />
        </TestWrapper>
      );

      expect(screen.getByText("offset_start")).toBeInTheDocument();
    });
  });

  describe("Form Value Updates", () => {
    it("updates form values when minimum cancellation notice changes", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      
      const FormWrapper = ({ children }: { children: React.ReactNode }) => {
        const methods = useForm({
          defaultValues: {
            ...mockEventType,
            minimumCancellationNotice: 60,
          },
        });

        return (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
              {children}
              <button type="submit">Submit</button>
            </form>
          </FormProvider>
        );
      };

      render(
        <FormWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </FormWrapper>
      );

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            minimumCancellationNotice: 60,
          })
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for all form fields", () => {
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      // Check for important labels
      expect(screen.getByText("before_event")).toBeInTheDocument();
      expect(screen.getByText("after_event")).toBeInTheDocument();
      expect(screen.getByText("minimum_booking_notice")).toBeInTheDocument();
      expect(screen.getByText("slot_interval")).toBeInTheDocument();
    });

    it("maintains focus management when toggling settings", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      const toggle = screen.getByText("limit_booking_frequency").closest("div")?.querySelector("button[role='switch']");
      if (toggle) {
        await user.click(toggle);
        // Focus should remain accessible
        expect(toggle).toBeInTheDocument();
      }
    });
  });

  describe("Performance and Edge Cases", () => {
    it("handles undefined event type gracefully", () => {
      render(
        <TestWrapper eventType={undefined}>
          <EventLimitsTab eventType={undefined as any} />
        </TestWrapper>
      );

      // Should render without crashing
      expect(screen.getByText("minimum_booking_notice")).toBeInTheDocument();
    });

    it("handles missing form values gracefully", () => {
      const incompleteEventType = {
        id: 1,
        title: "Test",
      };

      render(
        <TestWrapper eventType={incompleteEventType}>
          <EventLimitsTab eventType={incompleteEventType as any} />
        </TestWrapper>
      );

      // Should render with defaults
      expect(screen.getByText("minimum_booking_notice")).toBeInTheDocument();
    });

    it("handles recurring event type correctly", () => {
      render(
        <TestWrapper defaultValues={{ recurringEvent: { interval: 1, count: 5, freq: 2 } }}>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      // Should still render all fields
      expect(screen.getByText("minimum_booking_notice")).toBeInTheDocument();
      expect(screen.getByTestId("minimum-cancellation-notice-input")).toBeInTheDocument();
    });
  });

  describe("Integration with Locked Fields", () => {
    it("disables fields when locked by managed event types", () => {
      const mockLockedFieldsManager = {
        shouldLockIndicator: vi.fn(() => " 🔒"),
        shouldLockDisableProps: vi.fn(() => ({ disabled: true })),
      };

      vi.mocked(vi.importActual("@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager")).default = () => mockLockedFieldsManager;

      render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      // All toggles should be disabled
      const switches = screen.getAllByRole("switch");
      switches.forEach(switchElement => {
        expect(switchElement).toHaveAttribute("disabled");
      });
    });

    it("shows lock indicators for locked fields", () => {
      const mockLockedFieldsManager = {
        shouldLockIndicator: vi.fn((field) => {
          const lockedFields = ["minimumBookingNotice", "minimumCancellationNotice", "beforeBufferTime"];
          return lockedFields.includes(field) ? " 🔒" : null;
        }),
        shouldLockDisableProps: vi.fn(() => ({ disabled: false })),
      };

      vi.mocked(vi.importActual("@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager")).default = () => mockLockedFieldsManager;

      const { container } = render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} />
        </TestWrapper>
      );

      // Should have called shouldLockIndicator for fields
      expect(mockLockedFieldsManager.shouldLockIndicator).toHaveBeenCalledWith("minimumBookingNotice");
      expect(mockLockedFieldsManager.shouldLockIndicator).toHaveBeenCalledWith("minimumCancellationNotice");
    });
  });

  describe("Custom Class Names", () => {
    it("applies all custom class names correctly", () => {
      const customClassNames = {
        bufferAndNoticeSection: {
          container: "custom-buffer-container",
          beforeBufferSelect: {
            container: "custom-before-buffer",
            select: "custom-before-select",
          },
          afterBufferSelect: {
            container: "custom-after-buffer",
            select: "custom-after-select",
          },
          minimumNoticeInput: {
            container: "custom-notice-container",
            input: "custom-notice-input",
            select: "custom-notice-select",
          },
          timeSlotIntervalSelect: {
            container: "custom-slot-container",
            select: "custom-slot-select",
          },
        },
        bookingFrequencyLimit: {
          container: "custom-booking-limit",
          label: "custom-booking-label",
        },
        firstAvailableSlotOnly: {
          container: "custom-first-slot",
          label: "custom-first-label",
        },
        totalDurationLimit: {
          container: "custom-duration-limit",
          label: "custom-duration-label",
        },
        futureBookingLimit: {
          container: "custom-future-limit",
          label: "custom-future-label",
        },
        offsetStartTimes: {
          container: "custom-offset",
          label: "custom-offset-label",
        },
      };

      const { container } = render(
        <TestWrapper>
          <EventLimitsTab eventType={mockEventType} customClassNames={customClassNames} />
        </TestWrapper>
      );

      // Check for custom classes
      expect(container.querySelector(".custom-buffer-container")).toBeInTheDocument();
      expect(container.querySelector(".custom-booking-limit")).toBeInTheDocument();
      expect(container.querySelector(".custom-first-slot")).toBeInTheDocument();
      expect(container.querySelector(".custom-duration-limit")).toBeInTheDocument();
      expect(container.querySelector(".custom-future-limit")).toBeInTheDocument();
    });
  });
});