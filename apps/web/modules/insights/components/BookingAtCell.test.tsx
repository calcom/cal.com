import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { BookingAtCell } from "./BookingAtCell";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@calcom/dayjs", () => ({
  default: (_d: string) => ({
    format: () => "Jan 15, 2025 10:00",
  }),
}));

vi.mock("@calcom/lib/hooks/useCopy", () => ({
  useCopy: () => ({ copyToClipboard: vi.fn(), isCopied: false }),
}));

describe("BookingAtCell", () => {
  it("should render empty div when no bookingUserId", () => {
    const row = {
      bookingUserId: null,
      bookingCreatedAt: null,
      bookingUserAvatarUrl: null,
      bookingUserName: null,
      bookingUserEmail: null,
      bookingUid: null,
      bookingStatus: null,
      bookingAttendees: [],
    };
    const { container } = render(<BookingAtCell row={row as never} rowId={1} />);
    expect(container.querySelector(".w-\\[250px\\]")).toBeInTheDocument();
  });

  it("should render avatar and date badge when booking data exists", () => {
    const row = {
      bookingUserId: 1,
      bookingCreatedAt: "2025-01-15T10:00:00Z",
      bookingUserAvatarUrl: "https://example.com/avatar.jpg",
      bookingUserName: "John Doe",
      bookingUserEmail: "john@example.com",
      bookingUid: "abc-123",
      bookingStatus: "ACCEPTED",
      bookingAttendees: [],
    };
    render(<BookingAtCell row={row as never} rowId={1} />);
    expect(screen.getByText("Jan 15, 2025 10:00")).toBeInTheDocument();
  });
});
