import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { vi } from "vitest";

// Mock trpc
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      apps: {
        integrations: {
          useQuery: vi.fn(),
          invalidate: vi.fn(),
        },
      },
      calendars: {
        setDestinationCalendar: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
        },
        connectedCalendars: {
          invalidate: vi.fn(),
        },
      },
    },
    useUtils: vi.fn(() => ({
      viewer: {
        apps: {
          integrations: { invalidate: vi.fn() },
        },
        calendars: {
          connectedCalendars: { invalidate: vi.fn() },
        },
      },
    })),
  },
}));

vi.mock("@calcom/i18n/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/app-store/InstallAppButton", () => ({
  InstallAppButton: vi.fn(({ render: renderProp }) => renderProp({ onClick: vi.fn() })),
}));

// We only test the CalendarList function (inner component) which uses the tRPC query directly.
// CalendarListContainer is the outer wrapper that receives props.
// We need to extract CalendarList for testing - but it's not exported.
// Instead, we can test the behavior indirectly or mock the necessary dependencies.

// Mock all the UI components that CalendarList uses
vi.mock("@calcom/ui/components/alert", () => ({
  Alert: ({ severity, title, message }: { severity: string; title: string; message: string }) => (
    <div data-testid="alert" data-severity={severity}>
      <span>{title}</span>
      <span>{message}</span>
    </div>
  ),
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  Loader: () => <div data-testid="loader">Loading...</div>,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@calcom/ui/components/list", () => ({
  List: ({ children }: React.PropsWithChildren) => <ul>{children}</ul>,
}));

vi.mock("@calcom/ui/components/empty-screen", () => ({
  EmptyScreen: () => <div data-testid="empty-screen" />,
}));

vi.mock("@calcom/ui/components/layout", () => ({
  ShellSubHeading: () => <div />,
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

vi.mock("@calcom/web/modules/apps/components/AppListCard", () => ({
  default: ({ title }: { title: string }) => <li data-testid="app-list-card">{title}</li>,
}));

vi.mock("@calcom/web/modules/apps/components/SkeletonLoader", () => ({
  SkeletonLoader: () => <div data-testid="skeleton-loader" />,
}));

vi.mock("@calcom/web/modules/calendars/components/SelectedCalendarsSettingsWebWrapper", () => ({
  SelectedCalendarsSettingsWebWrapper: () => <div />,
}));

vi.mock("@calcom/web/app/cache/path/settings/my-account", () => ({
  revalidateSettingsCalendars: vi.fn(),
}));

vi.mock("@calcom/features/settings/appDir/SettingsHeader", () => ({
  default: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("@components/integrations/SubHeadingTitleWithConnections", () => ({
  default: () => <div />,
}));

vi.mock("@lib/hooks/useRouterQuery", () => ({
  default: () => ({ error: undefined, setQuery: vi.fn() }),
}));

vi.mock("./DestinationCalendarSettingsWebWrapper", () => ({
  DestinationCalendarSettingsWebWrapper: () => <div />,
}));

describe("CalendarListContainer - CalendarList query states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a loader when the integrations query is pending", async () => {
    const { trpc } = await import("@calcom/trpc/react");
    // @ts-expect-error - mock
    trpc.viewer.apps.integrations.useQuery.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    });

    // Import the module that uses CalendarList internally
    // CalendarList is rendered when fromOnboarding is true and there are no connectedCalendars
    const { CalendarListContainer } = await import("../CalendarListContainer");

    render(
      <CalendarListContainer
        connectedCalendars={{ connectedCalendars: [], destinationCalendar: undefined } as never}
        installedCalendars={{ items: [] } as never}
        fromOnboarding={true}
      />
    );

    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders an error alert when the integrations query fails", async () => {
    const { trpc } = await import("@calcom/trpc/react");
    // @ts-expect-error - mock
    trpc.viewer.apps.integrations.useQuery.mockReturnValue({
      isPending: false,
      isError: true,
      error: { message: "Network error" },
      data: undefined,
    });

    const { CalendarListContainer } = await import("../CalendarListContainer");

    render(
      <CalendarListContainer
        connectedCalendars={{ connectedCalendars: [], destinationCalendar: undefined } as never}
        installedCalendars={{ items: [] } as never}
        fromOnboarding={true}
      />
    );

    const alert = screen.getByTestId("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("data-severity", "error");
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders the app list when the integrations query succeeds", async () => {
    const { trpc } = await import("@calcom/trpc/react");
    // @ts-expect-error - mock
    trpc.viewer.apps.integrations.useQuery.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        items: [
          {
            name: "Google Calendar",
            logo: "/google-calendar.svg",
            description: "Google Calendar integration",
            slug: "google-calendar",
            type: "google_calendar",
          },
          {
            name: "Outlook Calendar",
            logo: "/outlook.svg",
            description: "Outlook Calendar integration",
            slug: "outlook-calendar",
            type: "outlook_calendar",
          },
        ],
      },
    });

    const { CalendarListContainer } = await import("../CalendarListContainer");

    render(
      <CalendarListContainer
        connectedCalendars={{ connectedCalendars: [], destinationCalendar: undefined } as never}
        installedCalendars={{ items: [] } as never}
        fromOnboarding={true}
      />
    );

    const cards = screen.getAllByTestId("app-list-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Outlook Calendar")).toBeInTheDocument();
  });
});
