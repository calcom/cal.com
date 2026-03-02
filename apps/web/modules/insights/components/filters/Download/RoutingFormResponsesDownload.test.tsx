import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockParams, mockTrpc } = vi.hoisted(() => ({
  mockParams: {
    startDate: "2025-01-01",
    endDate: "2025-01-31",
  },
  mockTrpc: {
    useUtils: vi.fn(() => ({
      viewer: {
        insights: {
          routingFormResponsesForDownload: { fetch: vi.fn() },
        },
      },
    })),
  },
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsRoutingParameters", () => ({
  useInsightsRoutingParameters: () => mockParams,
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

import { RoutingFormResponsesDownload } from "./RoutingFormResponsesDownload";

describe("RoutingFormResponsesDownload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should render download button", () => {
    render(<RoutingFormResponsesDownload sorting={[]} />);
    expect(screen.getByText("download")).toBeInTheDocument();
  });

  it("should render as_csv dropdown item", () => {
    render(<RoutingFormResponsesDownload sorting={[]} />);
    expect(screen.getByText("as_csv")).toBeInTheDocument();
  });
});
