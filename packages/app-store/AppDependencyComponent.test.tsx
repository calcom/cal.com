import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { AppDependencyComponent } from "./AppDependencyComponent";

// Type for dependency data
type MockDependency = {
  name: string;
  slug: string;
  installed: boolean;
};

// Mock the useLocale hook
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (key === "app_is_connected") {
        return `${values?.dependencyName} is connected`;
      }
      if (key === "this_app_requires_connected_account") {
        return `${values?.appName} requires a connected ${values?.dependencyName} account`;
      }
      if (key === "connect_app") {
        return `Connect ${values?.dependencyName}`;
      }
      return key;
    },
  }),
}));

// Mock constants and UI components
vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "http://localhost:3000",
}));

vi.mock("@calcom/ui/components/icon", () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <svg data-testid={`${name}-icon`} className={className}>
      {name}
    </svg>
  ),
}));

describe("AppDependencyComponent", () => {
  // Factory function to reduce duplication
  const createMockDependency = (overrides: Partial<MockDependency> = {}): MockDependency => ({
    name: "Google Calendar",
    slug: "google-calendar", 
    installed: true,
    ...overrides,
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows success indicators when dependencies are met", () => {
    const dependency = createMockDependency({ installed: true });
    const { container } = render(
      <AppDependencyComponent
        appName="Google Meet"
        dependencyData={[dependency]}
      />
    );

    expect(container.firstChild).toHaveClass("bg-subtle");
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar is connected")).toBeInTheDocument();
    expect(screen.getByText("Google Meet requires a connected Google Calendar account"))
      .toBeInTheDocument();
  });

  it("shows error indicators and connect link when dependencies are not met", () => {
    const dependency = createMockDependency({ installed: false });
    const { container } = render(
      <AppDependencyComponent
        appName="Google Meet"
        dependencyData={[dependency]}
      />
    );

    expect(container.firstChild).toHaveClass("bg-error");
    expect(screen.getByTestId("circle-x-icon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /connect google calendar/i }))
      .toHaveAttribute("href", expect.stringContaining("/apps/google-calendar"));
    expect(screen.getByText("Google Meet requires a connected Google Calendar account"))
      .toBeInTheDocument();
  });

  it("shows mixed states when some dependencies are unmet", () => {
    const dependencies = [
      createMockDependency({ installed: true }),
      createMockDependency({ installed: false }),
    ];

    const { container } = render(
      <AppDependencyComponent
        appName="Google Meet"
        dependencyData={dependencies}
      />
    );

    expect(container.firstChild).toHaveClass("bg-error");
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    expect(screen.getByTestId("circle-x-icon")).toBeInTheDocument();
  });

  it("shows only success indicators when all dependencies are met", () => {
    const dependencies = [
      createMockDependency({ installed: true }),
      createMockDependency({ name: "Zoom", slug: "zoom", installed: true }),
    ];

    const { container } = render(
      <AppDependencyComponent
        appName="Google Meet"
        dependencyData={dependencies}
      />
    );

    expect(container.firstChild).toHaveClass("bg-subtle");
    const checkIcons = screen.getAllByTestId("check-icon");
    expect(checkIcons).toHaveLength(2);
    expect(screen.queryByTestId("circle-x-icon")).not.toBeInTheDocument();
  });

  it("handles empty dependency data gracefully", () => {
    const { container } = render(
      <AppDependencyComponent appName="Google Meet" dependencyData={undefined} />
    );

    expect(container.firstChild).toHaveClass("bg-subtle");
    expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("circle-x-icon")).not.toBeInTheDocument();
  });

  it("handles empty dependency array gracefully", () => {
    const { container } = render(
      <AppDependencyComponent appName="Google Meet" dependencyData={[]} />
    );

    expect(container.firstChild).toHaveClass("bg-subtle");
    expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("circle-x-icon")).not.toBeInTheDocument();
  });

  it("treats truthy non-boolean values as installed", () => {
    const dependency = createMockDependency({ 
      installed: "yes" as unknown as boolean 
    });

    const { container } = render(
      <AppDependencyComponent
        appName="Google Meet"
        dependencyData={[dependency]}
      />
    );

    expect(container.firstChild).toHaveClass("bg-subtle");
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar is connected")).toBeInTheDocument();
  });

  it("displays requirement message consistently", () => {
    const dependency = createMockDependency({ installed: true });
    render(
      <AppDependencyComponent
        appName="Google Meet"
        dependencyData={[dependency]}
      />
    );

    expect(
      screen.getByText("Google Meet requires a connected Google Calendar account")
    ).toBeInTheDocument();
  });
});