import { render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi, beforeAll } from "vitest";

import CancelBooking from "../CancelBooking";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("@calcom/trpc", () => ({
  trpc: {
    viewer: {
      bookings: {
        requestReschedule: {
          useMutation: () => ({
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
      },
    },
  },
}));

vi.mock("next-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "cancellation_fee_warning_cancel") {
        return `Cancelling within ${options?.time} ${options?.unit} will result in a ${options?.amount} ${options?.formatParams?.amount?.currency} cancellation fee being charged to your card.`;
      }
      return key;
    },
  }),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "cancellation_fee_warning_cancel") {
        return `Cancelling within ${options?.time} ${options?.unit} will result in a ${options?.amount} ${options?.formatParams?.amount?.currency} cancellation fee being charged to your card.`;
      }
      return key;
    },
  }),
}));

vi.mock("@calcom/lib/hooks/useTelemetry", () => ({
  useTelemetry: () => ({
    event: vi.fn(),
  }),
}));

vi.mock("@calcom/lib/hooks/useRefreshData", () => ({
  useRefreshData: () => vi.fn(),
}));

vi.mock("next/router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    query: {},
  }),
}));

const mockBookingWithCancellationFee = {
  uid: "test-booking-uid",
  title: "Test Meeting",
  id: 123,
  startTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  eventType: {
    metadata: {
      apps: {
        stripe: {
          cancellationFeeEnabled: true,
          cancellationFeeTimeValue: 1,
          cancellationFeeTimeUnit: "hours" as const,
          paymentOption: "HOLD" as const,
        },
      },
    },
  },
  payment: [
    {
      amount: 1000,
      currency: "usd",
    },
  ],
};

const mockProps = {
  recurringEvent: null,
  setIsCancellationMode: vi.fn(),
  theme: "light",
  allRemainingBookings: false,
  seatReferenceUid: undefined,
  currentUserEmail: "test@example.com",
  bookingCancelledEventProps: {
    booking: {},
    organizer: {
      name: "Test Organizer",
      email: "organizer@example.com",
      timeZone: "UTC",
    },
    eventType: {},
  },
  internalNotePresets: [],
};

const mockBookingWithoutCancellationFee = {
  uid: "test-booking-uid-2",
  title: "Test Meeting 2",
  id: 124,
  startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  eventType: {
    metadata: {
      apps: {
        stripe: {
          cancellationFeeEnabled: true,
          cancellationFeeTimeValue: 1,
          cancellationFeeTimeUnit: "hours" as const,
          paymentOption: "HOLD" as const,
        },
      },
    },
  },
  payment: [
    {
      amount: 1000,
      currency: "usd",
    },
  ],
};

describe("CancelBooking Cancellation Fee Warning", () => {
  it("should show cancellation fee warning when booking is within time threshold", () => {
    render(
      <CancelBooking
        booking={mockBookingWithCancellationFee}
        profile={{ name: "Test User", slug: "test-user" }}
        team={null}
        isHost={false}
        {...mockProps}
      />
    );

    expect(screen.getByText(/Cancelling within 1 hours will result in a/)).toBeInTheDocument();
  });

  it("should not show cancellation fee warning when booking is outside time threshold", () => {
    render(
      <CancelBooking
        booking={mockBookingWithoutCancellationFee}
        profile={{ name: "Test User", slug: "test-user" }}
        team={null}
        isHost={false}
        {...mockProps}
      />
    );

    expect(screen.queryByText(/Cancelling within/)).not.toBeInTheDocument();
  });

  it("should not show cancellation fee warning when user is host", () => {
    render(
      <CancelBooking
        booking={mockBookingWithCancellationFee}
        profile={{ name: "Test User", slug: "test-user" }}
        team={null}
        isHost={true}
        {...mockProps}
      />
    );

    expect(screen.queryByText(/Cancelling within/)).not.toBeInTheDocument();
  });

  it("should not show cancellation fee warning when cancellation fee is disabled", () => {
    const bookingWithDisabledFee = {
      ...mockBookingWithCancellationFee,
      eventType: {
        metadata: {
          apps: {
            stripe: {
              cancellationFeeEnabled: false,
              cancellationFeeTimeValue: 1,
              cancellationFeeTimeUnit: "hours" as const,
              paymentOption: "HOLD" as const,
            },
          },
        },
      },
    };

    render(
      <CancelBooking
        booking={bookingWithDisabledFee}
        profile={{ name: "Test User", slug: "test-user" }}
        team={null}
        isHost={false}
        {...mockProps}
      />
    );

    expect(screen.queryByText(/Cancelling within/)).not.toBeInTheDocument();
  });

  it("should not show cancellation fee warning when payment option is not HOLD", () => {
    const bookingWithOnBookingPayment = {
      ...mockBookingWithCancellationFee,
      eventType: {
        metadata: {
          apps: {
            stripe: {
              cancellationFeeEnabled: true,
              cancellationFeeTimeValue: 1,
              cancellationFeeTimeUnit: "hours" as const,
              paymentOption: "ON_BOOKING" as const,
            },
          },
        },
      },
    };

    render(
      <CancelBooking
        booking={bookingWithOnBookingPayment}
        profile={{ name: "Test User", slug: "test-user" }}
        team={null}
        isHost={false}
        {...mockProps}
      />
    );

    expect(screen.queryByText(/Cancelling within/)).not.toBeInTheDocument();
  });
});
