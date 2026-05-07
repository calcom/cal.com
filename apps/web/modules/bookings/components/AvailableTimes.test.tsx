import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { AvailableTimes } from "./AvailableTimes";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, props?: any) => {
        if (key === "seats_available") return `${props.count} seats available`;
        return key;
    },
    i18n: { language: "en" },
  }),
}));

vi.mock("@calcom/features/bookings/Booker/BookerStoreProvider", () => ({
  useBookerStoreContext: (fn: any) => fn({ layout: "month_view", bookingData: null }),
}));

vi.mock("@calcom/features/bookings/Booker/hooks/useBookerTime", () => ({
  useBookerTime: () => ({
    timeFormat: "h:mm a",
    timezone: "UTC",
  }),
}));

vi.mock("@calcom/features/bookings/Booker/utils/query-param", () => ({
  getQueryParam: () => null,
}));

vi.mock("@calcom/features/bookings/lib/useCheckOverlapWithOverlay", () => ({
  useCheckOverlapWithOverlay: () => ({
    isOverlapping: false,
    overlappingTimeEnd: null,
    overlappingTimeStart: null,
  }),
}));

const mockEvent = {
  data: {
    length: 30,
    bookingFields: [],
    price: 0,
    currency: "USD",
    metadata: {},
  },
};

describe("AvailableTimes", () => {
  it("renders available slots correctly", () => {
    const slots = [
      { time: "2024-01-01T10:00:00Z", attendees: 0 },
      { time: "2024-01-01T11:00:00Z", attendees: 1 },
    ];

    render(
      <AvailableTimes
        slots={slots}
        event={mockEvent}
        seatsPerTimeSlot={2}
        showAvailableSeatsCount={true}
      />
    );

    expect(screen.getByText("10:00 am")).toBeInTheDocument();
    expect(screen.getByText("11:00 am")).toBeInTheDocument();
    expect(screen.getByText("2 seats available")).toBeInTheDocument();
    expect(screen.getByText("1 seats available")).toBeInTheDocument();
  });

  it("renders fully booked slots as disabled", () => {
    const slots = [
      { time: "2024-01-01T10:00:00Z", attendees: 2 },
    ];

    render(
      <AvailableTimes
        slots={slots}
        event={mockEvent}
        seatsPerTimeSlot={2}
        showAvailableSeatsCount={true}
      />
    );

    const button = screen.getByRole("button", { name: /10:00 am/i });
    expect(button).toBeDisabled();
    expect(screen.getByText("booking_full")).toBeInTheDocument();
  });
});
