import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc, mockParams } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: {
      insights: {
        routedToPerPeriod: { useQuery: vi.fn() },
        routedToPerPeriodCsv: { fetch: vi.fn() },
      },
    },
    useContext: vi.fn(() => ({
      viewer: {
        insights: {
          routedToPerPeriodCsv: { fetch: vi.fn() },
        },
      },
    })),
  },
  mockParams: {},
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Rectangle: () => null,
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/web/modules/insights/hooks/useInsightsRoutingParameters", () => ({
  useInsightsRoutingParameters: () => mockParams,
}));
vi.mock("nuqs", () => ({
  useQueryState: vi.fn(() => ["", vi.fn()]),
}));
vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));
vi.mock("@calcom/lib/csvUtils", () => ({
  downloadAsCsv: vi.fn(),
}));

import { RoutedToPerPeriod } from "./RoutedToPerPeriod";

describe("RoutedToPerPeriod", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Make requestAnimationFrame synchronous to prevent jsdom cleanup race.
    // jsdom polyfills rAF via setTimeout; if the callback fires after the
    // window is torn down, accessing window._location throws.
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("should show loading state when isPending", () => {
    mockTrpc.viewer.insights.routedToPerPeriod.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    render(<RoutedToPerPeriod />);
    expect(screen.getByText("routed_to_per_period")).toBeInTheDocument();
  });

  it("should render period toggle options", () => {
    mockTrpc.viewer.insights.routedToPerPeriod.useQuery.mockReturnValue({
      data: {
        users: { data: [] },
        periodStats: { data: [] },
      },
      isLoading: false,
      isError: false,
    });
    render(<RoutedToPerPeriod />);
    expect(screen.getByText("per_day")).toBeInTheDocument();
    expect(screen.getByText("per_week")).toBeInTheDocument();
    expect(screen.getByText("per_month")).toBeInTheDocument();
  });

  it("should render user column header", () => {
    mockTrpc.viewer.insights.routedToPerPeriod.useQuery.mockReturnValue({
      data: {
        users: { data: [] },
        periodStats: { data: [] },
      },
      isLoading: false,
      isError: false,
    });
    render(<RoutedToPerPeriod />);
    expect(screen.getByText("user")).toBeInTheDocument();
  });
});
