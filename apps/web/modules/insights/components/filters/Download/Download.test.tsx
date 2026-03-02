import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockParams, mockTrpc } = vi.hoisted(() => ({
  mockParams: {
    columnFilters: [],
    selectedTeamId: 1,
  },
  mockTrpc: {
    useUtils: vi.fn(() => ({
      viewer: {
        insights: {
          rawData: { fetch: vi.fn() },
        },
      },
    })),
  },
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("../../../hooks/useInsightsBookingParameters", () => ({
  useInsightsBookingParameters: () => mockParams,
}));
vi.mock("@calcom/features/insights/lib/bookingUtils", () => ({
  extractDateRangeFromColumnFilters: vi.fn(() => ({
    startDate: "2025-01-01",
    endDate: "2025-01-31",
  })),
}));
vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));
vi.mock("@calcom/lib/csvUtils", () => ({
  downloadAsCsv: vi.fn(),
}));
vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
  showProgressToast: vi.fn(),
  hideProgressToast: vi.fn(),
}));

vi.mock("@calcom/ui/components/dropdown", () => ({
  Dropdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { Download } from "./Download";

describe("Download", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should render download button", () => {
    render(<Download />);
    expect(screen.getByText("download")).toBeInTheDocument();
  });

  it("should render as_csv dropdown item", () => {
    render(<Download />);
    expect(screen.getByText("as_csv")).toBeInTheDocument();
  });
});
