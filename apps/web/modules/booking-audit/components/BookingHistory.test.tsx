import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params || Object.keys(params).length === 0) return key;
      return `${key}(${Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(",")})`;
    },
  }),
}));

vi.mock("@calcom/lib/components/ServerTrans", () => ({
  __esModule: true,
  default: ({ i18nKey }: { i18nKey: string }) => <span data-testid="server-trans">{i18nKey}</span>,
}));

vi.mock("date-fns", () => ({
  format: () => "2026-01-15 10:30:00",
  formatDistanceToNow: () => "2 hours ago",
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  ),
}));

const mockUseQuery = vi.fn();

function createTrpcProxy(): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "useQuery") return (...args: unknown[]) => mockUseQuery(...args);
        if (prop === "useMutation") return () => ({ mutate: vi.fn(), isLoading: false });
        return createTrpcProxy();
      },
    }
  );
}

vi.mock("@calcom/trpc/react", () => ({ trpc: createTrpcProxy() }));

vi.mock("@calcom/web/modules/billing/upgrade-banners/WideUpgradeBannerForBookingAudit", () => ({
  WideUpgradeBannerForBookingAudit: () => <div data-testid="upgrade-banner">Upgrade required</div>,
}));

vi.mock("@calcom/ui/components/avatar", () => ({
  Avatar: ({ alt }: { alt?: string }) => <div data-testid="avatar" aria-label={alt} />,
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: () => <div data-testid="skeleton" />,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@calcom/ui/components/form", () => ({
  FilterSearchField: (props: { value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement> }) => (
    <input data-testid="filter-search" value={props.value ?? ""} onChange={props.onChange} />
  ),
  Select: (props: {
    options?: Array<{ label: string; value: string }>;
    onChange?: (opt: { label: string; value: string }) => void;
  }) => {
    const options = props.options ?? [];
    return (
      <select
        data-testid="actor-select"
        onChange={(e) => {
          const opt = options.find((o) => o.value === e.target.value);
          if (opt) props.onChange?.(opt);
        }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  },
}));

vi.mock("@calcom/ui/components/icon", () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid="icon" data-icon={name} className={className} />
  ),
}));

vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content?: string }) => (
    <div data-testid="tooltip" title={content}>
      {children}
    </div>
  ),
}));

import { BookingHistory } from "./BookingHistory";

function createTestLog(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    action: "CREATED",
    type: "BOOKING",
    timestamp: "2026-01-15T10:30:00Z",
    source: "WEB",
    displayJson: null,
    actionDisplayTitle: { key: "booking_created" },
    displayFields: null,
    actor: {
      type: "USER" as const,
      displayName: "John Doe",
      displayEmail: "john@example.com",
      displayAvatar: null,
    },
    impersonatedBy: null,
    hasError: false,
    ...overrides,
  };
}

function mockSuccessResponse(logs: ReturnType<typeof createTestLog>[]) {
  mockUseQuery.mockReturnValue({
    data: { auditLogs: logs },
    isLoading: false,
    error: null,
  });
}

function renderBookingHistory(props: Partial<{ bookingUid: string; isOrgUser: boolean }> = {}) {
  return render(
    <BookingHistory bookingUid={props.bookingUid ?? "test-uid"} isOrgUser={props.isOrgUser ?? true} />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BookingHistory", () => {
  describe("when user is not an org member", () => {
    it("shows the upgrade banner instead of audit logs", () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
      renderBookingHistory({ isOrgUser: false });

      expect(screen.getByTestId("upgrade-banner")).toBeInTheDocument();
      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    });

    it("disables the query so no data is fetched", () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
      renderBookingHistory({ isOrgUser: false });

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ bookingUid: "test-uid" }),
        expect.objectContaining({ enabled: false })
      );
    });
  });

  describe("when loading", () => {
    it("shows skeleton placeholders while data is being fetched", () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
      renderBookingHistory();

      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("when the query fails", () => {
    it("shows an error message", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: "Network error" },
      });
      renderBookingHistory();

      expect(screen.getByText("error_loading_booking_logs")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  describe("when audit logs load successfully", () => {
    describe("with no log entries", () => {
      it("shows an empty state message", () => {
        mockSuccessResponse([]);
        renderBookingHistory();

        expect(screen.getByText("no_audit_logs_found")).toBeInTheDocument();
      });
    });

    describe("timeline rendering", () => {
      it("renders each log entry with its action title and actor name", () => {
        mockSuccessResponse([
          createTestLog({
            id: "1",
            actionDisplayTitle: { key: "booking_created" },
            actor: { type: "USER", displayName: "Alice", displayEmail: null, displayAvatar: null },
          }),
          createTestLog({
            id: "2",
            actionDisplayTitle: { key: "booking_cancelled" },
            actor: { type: "USER", displayName: "Bob", displayEmail: null, displayAvatar: null },
          }),
        ]);
        renderBookingHistory();

        expect(screen.getByText("booking_created")).toBeInTheDocument();
        expect(screen.getByText("booking_cancelled")).toBeInTheDocument();
        expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
      });

      it("shows relative timestamp for each log entry", () => {
        mockSuccessResponse([createTestLog()]);
        renderBookingHistory();

        expect(screen.getByText("2 hours ago")).toBeInTheDocument();
      });

      it("shows avatar when actor has a profile image", () => {
        mockSuccessResponse([
          createTestLog({
            actor: {
              type: "USER",
              displayName: "Alice",
              displayEmail: null,
              displayAvatar: "https://example.com/avatar.jpg",
            },
          }),
        ]);
        renderBookingHistory();

        expect(screen.getByTestId("avatar")).toBeInTheDocument();
      });

      it("uses action-specific icon for known actions", () => {
        mockSuccessResponse([createTestLog({ action: "CANCELLED" })]);
        renderBookingHistory();

        const icons = screen.getAllByTestId("icon");
        expect(icons.some((icon) => icon.getAttribute("data-icon") === "ban")).toBe(true);
      });

      it("falls back to sparkles icon for unknown actions", () => {
        mockSuccessResponse([createTestLog({ action: "SOME_FUTURE_ACTION" })]);
        renderBookingHistory();

        const icons = screen.getAllByTestId("icon");
        expect(icons.some((icon) => icon.getAttribute("data-icon") === "sparkles")).toBe(true);
      });

      it("shows warning icon when log entry has an error", () => {
        mockSuccessResponse([createTestLog({ hasError: true })]);
        renderBookingHistory();

        const icons = screen.getAllByTestId("icon");
        expect(icons.some((icon) => icon.getAttribute("data-icon") === "triangle-alert")).toBe(true);
      });

      it("labels guest actors with (guest) role", () => {
        mockSuccessResponse([
          createTestLog({
            actor: { type: "GUEST", displayName: "External User", displayEmail: null, displayAvatar: null },
          }),
        ]);
        renderBookingHistory();

        expect(screen.getByText(/\(guest\)/)).toBeInTheDocument();
      });

      it("labels attendee actors with (attendee) role", () => {
        mockSuccessResponse([
          createTestLog({
            actor: {
              type: "ATTENDEE",
              displayName: "Meeting Participant",
              displayEmail: null,
              displayAvatar: null,
            },
          }),
        ]);
        renderBookingHistory();

        expect(screen.getByText(/\(attendee\)/)).toBeInTheDocument();
      });

      it("does not show a role label for regular user actors", () => {
        mockSuccessResponse([
          createTestLog({
            actor: { type: "USER", displayName: "Team Member", displayEmail: null, displayAvatar: null },
          }),
        ]);
        renderBookingHistory();

        expect(screen.queryByText(/\(user\)/)).not.toBeInTheDocument();
      });
    });

    describe("expanding log details", () => {
      it("reveals detail rows when 'show details' is clicked", () => {
        mockSuccessResponse([createTestLog({ source: "WEB" })]);
        renderBookingHistory();

        fireEvent.click(screen.getByText("show_details"));

        expect(screen.getByText("booking_audit_action.source")).toBeInTheDocument();
        expect(screen.getByText("WEB")).toBeInTheDocument();
        expect(screen.getByText("timestamp")).toBeInTheDocument();
        expect(screen.getByText("2026-01-15 10:30:00")).toBeInTheDocument();
      });

      it("hides detail rows when 'hide details' is clicked", () => {
        mockSuccessResponse([createTestLog()]);
        renderBookingHistory();

        fireEvent.click(screen.getByText("show_details"));
        expect(screen.getByText("booking_audit_action.source")).toBeInTheDocument();

        fireEvent.click(screen.getByText("hide_details"));
        expect(screen.queryByText("booking_audit_action.source")).not.toBeInTheDocument();
      });

      it("shows actor name in the details panel", () => {
        mockSuccessResponse([
          createTestLog({
            actor: { type: "USER", displayName: "Alice Smith", displayEmail: null, displayAvatar: null },
          }),
        ]);
        renderBookingHistory();

        fireEvent.click(screen.getByText("show_details"));

        expect(screen.getByText("actor")).toBeInTheDocument();
      });

      it("shows impersonation info when the actor was impersonated", () => {
        mockSuccessResponse([
          createTestLog({
            actor: { type: "USER", displayName: "Admin User", displayEmail: null, displayAvatar: null },
            impersonatedBy: {
              displayName: "Support Agent",
              displayEmail: "support@example.com",
              displayAvatar: null,
            },
          }),
        ]);
        renderBookingHistory();

        fireEvent.click(screen.getByText("show_details"));

        expect(screen.getByText("Support Agent")).toBeInTheDocument();
        expect(screen.getByText(/actor_impersonated_by/)).toBeInTheDocument();
      });

      it("does not show impersonation section when actor was not impersonated", () => {
        mockSuccessResponse([createTestLog({ impersonatedBy: null })]);
        renderBookingHistory();

        fireEvent.click(screen.getByText("show_details"));

        expect(screen.queryByText(/actor_impersonated_by/)).not.toBeInTheDocument();
      });
    });

    describe("display field types", () => {
      it("renders rawValue fields as plain text", () => {
        mockSuccessResponse([
          createTestLog({
            displayFields: [
              { labelKey: "location", fieldValue: { type: "rawValue", value: "Conference Room A" } },
            ],
          }),
        ]);
        renderBookingHistory();
        fireEvent.click(screen.getByText("show_details"));

        expect(screen.getByText("location")).toBeInTheDocument();
        expect(screen.getByText("Conference Room A")).toBeInTheDocument();
      });

      it("renders rawValues as a vertical list", () => {
        mockSuccessResponse([
          createTestLog({
            displayFields: [
              {
                labelKey: "attendees",
                fieldValue: { type: "rawValues", values: ["alice@example.com", "bob@example.com"] },
              },
            ],
          }),
        ]);
        renderBookingHistory();
        fireEvent.click(screen.getByText("show_details"));

        expect(screen.getByText("alice@example.com")).toBeInTheDocument();
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      });

      it("renders translationKey fields through the translator", () => {
        mockSuccessResponse([
          createTestLog({
            displayFields: [
              { labelKey: "status", fieldValue: { type: "translationKey", valueKey: "confirmed" } },
            ],
          }),
        ]);
        renderBookingHistory();
        fireEvent.click(screen.getByText("show_details"));

        expect(screen.getByText("confirmed")).toBeInTheDocument();
      });

      it("renders translationsWithParams fields with interpolated parameters", () => {
        mockSuccessResponse([
          createTestLog({
            displayFields: [
              {
                labelKey: "changes",
                fieldValue: {
                  type: "translationsWithParams",
                  valuesWithParams: [{ key: "duration_changed", params: { from: 30, to: 60 } }],
                },
              },
            ],
          }),
        ]);
        renderBookingHistory();
        fireEvent.click(screen.getByText("show_details"));

        expect(screen.getByText("duration_changed(from=30,to=60)")).toBeInTheDocument();
      });
    });

    describe("JSON viewer", () => {
      it("shows a toggle button when displayJson has data", () => {
        mockSuccessResponse([createTestLog({ displayJson: { key: "value" } })]);
        renderBookingHistory();
        fireEvent.click(screen.getByText("show_details"));

        expect(screen.getByText("json")).toBeInTheDocument();
      });

      it("renders formatted JSON with line numbers when toggled open", () => {
        mockSuccessResponse([createTestLog({ displayJson: { booking: "confirmed" } })]);
        renderBookingHistory();
        fireEvent.click(screen.getByText("show_details"));
        fireEvent.click(screen.getByText("json"));

        expect(screen.getByText(/"booking": "confirmed"/)).toBeInTheDocument();
      });

      it("does not show JSON toggle when displayJson is null", () => {
        mockSuccessResponse([createTestLog({ displayJson: null })]);
        renderBookingHistory();
        fireEvent.click(screen.getByText("show_details"));

        expect(screen.queryByText("json")).not.toBeInTheDocument();
      });

      it("does not show JSON toggle when displayJson is empty", () => {
        mockSuccessResponse([createTestLog({ displayJson: {} })]);
        renderBookingHistory();
        fireEvent.click(screen.getByText("show_details"));

        expect(screen.queryByText("json")).not.toBeInTheDocument();
      });
    });

    describe("action titles", () => {
      it("renders simple translation keys", () => {
        mockSuccessResponse([createTestLog({ actionDisplayTitle: { key: "booking_was_created" } })]);
        renderBookingHistory();

        expect(screen.getByText("booking_was_created")).toBeInTheDocument();
      });

      it("renders titles with link components via ServerTrans", () => {
        mockSuccessResponse([
          createTestLog({
            actionDisplayTitle: {
              key: "rescheduled_to_link",
              params: { date: "Jan 20" },
              components: [{ type: "link", href: "/booking/123" }],
            },
          }),
        ]);
        renderBookingHistory();

        const serverTrans = screen.getByTestId("server-trans");
        expect(serverTrans).toHaveTextContent("rescheduled_to_link");
      });
    });

    describe("search filtering", () => {
      it("filters logs by action name matching the search term", () => {
        mockSuccessResponse([
          createTestLog({ id: "1", action: "CREATED", actionDisplayTitle: { key: "booking_created" } }),
          createTestLog({ id: "2", action: "CANCELLED", actionDisplayTitle: { key: "booking_cancelled" } }),
        ]);
        renderBookingHistory();

        fireEvent.change(screen.getByTestId("filter-search"), { target: { value: "CANCEL" } });

        expect(screen.queryByText("booking_created")).not.toBeInTheDocument();
        expect(screen.getByText("booking_cancelled")).toBeInTheDocument();
      });

      it("filters logs by actor name matching the search term", () => {
        mockSuccessResponse([
          createTestLog({
            id: "1",
            actionDisplayTitle: { key: "log_a" },
            actor: { type: "USER", displayName: "Alice", displayEmail: null, displayAvatar: null },
          }),
          createTestLog({
            id: "2",
            actionDisplayTitle: { key: "log_b" },
            actor: { type: "USER", displayName: "Bob", displayEmail: null, displayAvatar: null },
          }),
        ]);
        renderBookingHistory();

        fireEvent.change(screen.getByTestId("filter-search"), { target: { value: "Alice" } });

        expect(screen.getByText("log_a")).toBeInTheDocument();
        expect(screen.queryByText("log_b")).not.toBeInTheDocument();
      });

      it("shows all logs when search is cleared", () => {
        mockSuccessResponse([
          createTestLog({ id: "1", actionDisplayTitle: { key: "log_a" } }),
          createTestLog({ id: "2", actionDisplayTitle: { key: "log_b" } }),
        ]);
        renderBookingHistory();

        const searchInput = screen.getByTestId("filter-search");
        fireEvent.change(searchInput, { target: { value: "log_a" } });
        expect(screen.queryByText("log_b")).not.toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: "" } });
        expect(screen.getByText("log_a")).toBeInTheDocument();
        expect(screen.getByText("log_b")).toBeInTheDocument();
      });
    });

    describe("actor filter dropdown", () => {
      it("filters to show only the selected actor's logs", () => {
        mockSuccessResponse([
          createTestLog({
            id: "1",
            actionDisplayTitle: { key: "log_a" },
            actor: { type: "USER", displayName: "Alice", displayEmail: null, displayAvatar: null },
          }),
          createTestLog({
            id: "2",
            actionDisplayTitle: { key: "log_b" },
            actor: { type: "USER", displayName: "Bob", displayEmail: null, displayAvatar: null },
          }),
        ]);
        renderBookingHistory();

        fireEvent.change(screen.getByTestId("actor-select"), { target: { value: "Alice" } });

        expect(screen.getByText("log_a")).toBeInTheDocument();
        expect(screen.queryByText("log_b")).not.toBeInTheDocument();
      });

      it("shows all logs when 'all' is selected after filtering", () => {
        mockSuccessResponse([
          createTestLog({
            id: "1",
            actionDisplayTitle: { key: "log_a" },
            actor: { type: "USER", displayName: "Alice", displayEmail: null, displayAvatar: null },
          }),
          createTestLog({
            id: "2",
            actionDisplayTitle: { key: "log_b" },
            actor: { type: "USER", displayName: "Bob", displayEmail: null, displayAvatar: null },
          }),
        ]);
        renderBookingHistory();

        fireEvent.change(screen.getByTestId("actor-select"), { target: { value: "Alice" } });
        expect(screen.queryByText("log_b")).not.toBeInTheDocument();

        fireEvent.change(screen.getByTestId("actor-select"), { target: { value: "" } });
        expect(screen.getByText("log_a")).toBeInTheDocument();
        expect(screen.getByText("log_b")).toBeInTheDocument();
      });
    });
  });
});
