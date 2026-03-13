import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}:${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      admin: {
        watchlist: {
          getEntryImpact: {
            useQuery: vi.fn().mockReturnValue({ data: null, isLoading: false }),
          },
        },
      },
    },
  },
}));

vi.mock("@calcom/ui/components/alert", () => ({
  Alert: ({
    severity,
    title,
    message,
  }: {
    severity: string;
    title: string;
    message: string;
    CustomIcon?: string;
    customIconColor?: string;
  }) => (
    <div data-testid={`alert-${severity}`} data-title={title}>
      {message}
    </div>
  ),
}));

vi.mock("@calcom/ui/components/badge", () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
    <span data-testid={`badge-${variant}`}>{children}</span>
  ),
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: ({ className }: { className: string }) => <div data-testid="skeleton" className={className} />,
}));

import type { EntryImpactData } from "./EntryImpactPanel";
import { EntryImpactPanel } from "./EntryImpactPanel";

function makeImpact(overrides: Partial<EntryImpactData> = {}): EntryImpactData {
  return {
    totalBookings: 0,
    recentBookings: 0,
    distinctHostCount: 0,
    affectedOrgCount: 0,
    reportCount: 0,
    reportsByReason: { spam: 0, dontKnowPerson: 0, other: 0 },
    existingOrgBlockCount: 0,
    statusBreakdown: { accepted: 0, cancelled: 0, rejected: 0, pending: 0, awaitingHost: 0 },
    topAffectedOrgs: [],
    ...overrides,
  };
}

describe("EntryImpactPanel", () => {
  describe("loading state", () => {
    it("renders skeleton when loading", () => {
      render(<EntryImpactPanel impact={null} isLoading={true} />);
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });

    it("shows warning alert during loading (not error)", () => {
      render(<EntryImpactPanel impact={null} isLoading={true} />);
      expect(screen.getByTestId("alert-warning")).toBeDefined();
      expect(screen.queryByTestId("alert-error")).toBeNull();
    });
  });

  describe("no data", () => {
    it("renders fallback text when impact is null and not loading", () => {
      render(<EntryImpactPanel impact={null} isLoading={false} />);
      expect(screen.getByText("no_impact_data_available")).toBeDefined();
    });
  });

  describe("standard warning (has spam signals)", () => {
    it("shows warning alert when reports exist", () => {
      const impact = makeImpact({
        totalBookings: 10,
        affectedOrgCount: 2,
        reportsByReason: { spam: 5, dontKnowPerson: 0, other: 0 },
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);
      expect(screen.getByTestId("alert-warning")).toBeDefined();
      expect(screen.queryByTestId("alert-error")).toBeNull();
    });

    it("shows warning alert when existing org blocks exist", () => {
      const impact = makeImpact({
        totalBookings: 10,
        affectedOrgCount: 1,
        existingOrgBlockCount: 2,
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);
      expect(screen.getByTestId("alert-warning")).toBeDefined();
    });
  });

  describe("dangerous alert (no spam signals, bookings in orgs)", () => {
    it("shows error alert when bookings exist in orgs but zero reports and zero blocks", () => {
      const impact = makeImpact({
        totalBookings: 15,
        affectedOrgCount: 3,
        reportsByReason: { spam: 0, dontKnowPerson: 0, other: 0 },
        existingOrgBlockCount: 0,
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      const errorAlert = screen.getByTestId("alert-error");
      expect(errorAlert).toBeDefined();
      expect(errorAlert.getAttribute("data-title")).toBe("no_spam_signals_warning_title");
    });

    it("does NOT show error alert when totalBookings is 0", () => {
      const impact = makeImpact({
        totalBookings: 0,
        affectedOrgCount: 0,
        reportsByReason: { spam: 0, dontKnowPerson: 0, other: 0 },
        existingOrgBlockCount: 0,
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);
      expect(screen.queryByTestId("alert-error")).toBeNull();
      expect(screen.getByTestId("alert-warning")).toBeDefined();
    });

    it("does NOT show error alert when affectedOrgCount is 0 even with bookings", () => {
      const impact = makeImpact({
        totalBookings: 10,
        affectedOrgCount: 0,
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);
      expect(screen.queryByTestId("alert-error")).toBeNull();
    });
  });

  describe("top affected organizations table", () => {
    it("renders org rows when topAffectedOrgs is populated", () => {
      const impact = makeImpact({
        topAffectedOrgs: [
          { id: 1, name: "Acme Inc", bookingCount: 10, reportCount: 3 },
          { id: 2, name: "Globex", bookingCount: 5, reportCount: 0 },
        ],
        affectedOrgCount: 2,
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByText("Acme Inc")).toBeDefined();
      expect(screen.getByText("Globex")).toBeDefined();
      expect(screen.getByText("10")).toBeDefined();
      expect(screen.getByText("5")).toBeDefined();
    });

    it("shows 'and N more' when affectedOrgCount exceeds displayed orgs", () => {
      const impact = makeImpact({
        topAffectedOrgs: [{ id: 1, name: "Acme", bookingCount: 10, reportCount: 0 }],
        affectedOrgCount: 5,
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByText(/and_count_more_organizations/)).toBeDefined();
    });

    it("does not show 'and N more' when all orgs are displayed", () => {
      const impact = makeImpact({
        topAffectedOrgs: [{ id: 1, name: "Acme", bookingCount: 10, reportCount: 0 }],
        affectedOrgCount: 1,
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.queryByText(/and_count_more_organizations/)).toBeNull();
    });
  });

  describe("booking activity stats", () => {
    it("renders total bookings, recent, and distinct hosts", () => {
      const impact = makeImpact({
        totalBookings: 25,
        recentBookings: 8,
        distinctHostCount: 12,
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByText("25")).toBeDefined();
      expect(screen.getByText("8")).toBeDefined();
      expect(screen.getByText("12")).toBeDefined();
    });

    it("shows cancelled/rejected percentage", () => {
      const impact = makeImpact({
        totalBookings: 100,
        statusBreakdown: { accepted: 60, cancelled: 30, rejected: 10, pending: 0, awaitingHost: 0 },
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByText("40%")).toBeDefined();
    });

    it("shows 0% when no bookings", () => {
      const impact = makeImpact({ totalBookings: 0 });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByText("0%")).toBeDefined();
    });
  });

  describe("existing signals section", () => {
    it("shows spam badge when spam reports exist", () => {
      const impact = makeImpact({
        reportsByReason: { spam: 5, dontKnowPerson: 0, other: 0 },
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByTestId("badge-red")).toBeDefined();
    });

    it("shows dont-know-person badge when those reports exist", () => {
      const impact = makeImpact({
        reportsByReason: { spam: 0, dontKnowPerson: 3, other: 0 },
      });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByTestId("badge-orange")).toBeDefined();
    });

    it("shows existing org block count", () => {
      const impact = makeImpact({ existingOrgBlockCount: 4 });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByText(/orgs_already_blocked_this/)).toBeDefined();
    });

    it("hides signals section when no reports and no blocks", () => {
      const impact = makeImpact();

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.queryByText("existing_signals")).toBeNull();
    });
  });

  describe("no activity message", () => {
    it("shows no-activity message when everything is zero", () => {
      const impact = makeImpact();

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.getByText("no_matching_activity_last_30_days")).toBeDefined();
    });

    it("hides no-activity message when bookings exist", () => {
      const impact = makeImpact({ totalBookings: 1 });

      render(<EntryImpactPanel impact={impact} isLoading={false} />);

      expect(screen.queryByText("no_matching_activity_last_30_days")).toBeNull();
    });
  });
});
