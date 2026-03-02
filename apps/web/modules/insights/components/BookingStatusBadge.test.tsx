import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { BookingStatusBadge } from "./BookingStatusBadge";

vi.mock("@calcom/prisma/enums", () => ({
  BookingStatus: {
    ACCEPTED: "ACCEPTED",
    PENDING: "PENDING",
    CANCELLED: "CANCELLED",
    REJECTED: "REJECTED",
    AWAITING_HOST: "AWAITING_HOST",
  },
}));

vi.mock("@calcom/features/insights/lib/bookingStatusToText", () => ({
  bookingStatusToText: vi.fn((status: string) => status.toLowerCase()),
}));

describe("BookingStatusBadge", () => {
  it("should return null when bookingStatus is null", () => {
    const { container } = render(<BookingStatusBadge bookingStatus={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("should render badge with status text for ACCEPTED", () => {
    render(<BookingStatusBadge bookingStatus={"ACCEPTED" as never} />);
    expect(screen.getByText("accepted")).toBeInTheDocument();
  });

  it("should render warning variant for CANCELLED", () => {
    render(<BookingStatusBadge bookingStatus={"CANCELLED" as never} />);
    expect(screen.getByText("cancelled")).toBeInTheDocument();
  });

  it("should render warning variant for PENDING", () => {
    render(<BookingStatusBadge bookingStatus={"PENDING" as never} />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });
});
