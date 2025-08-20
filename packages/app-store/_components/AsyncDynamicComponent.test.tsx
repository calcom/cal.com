import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, vi, beforeEach } from "vitest";

import AsyncDynamicComponent from "./AsyncDynamicComponent";

// Mock the skeleton component
vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className}>
      Loading...
    </div>
  ),
}));

const MockComponent = ({ testProp }: { testProp?: string }) => (
  <div data-testid="mock-component">{testProp || "Mock Component"}</div>
);

describe("AsyncDynamicComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should render loading skeleton initially", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const componentMapPromise = new Promise<Record<string, React.ComponentType<unknown>>>(() => {}); // Never resolves

    render(
      <AsyncDynamicComponent
        componentMapPromise={componentMapPromise}
        slug="test-app"
        wrapperClassName="test-wrapper"
      />
    );

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("should render component when promise resolves", async () => {
    const componentMap = {
      "test-app": MockComponent,
    };
    const componentMapPromise = Promise.resolve(componentMap);

    render(
      <AsyncDynamicComponent
        componentMapPromise={componentMapPromise}
        slug="test-app"
        testProp="Hello World"
      />
    );

    // Initially shows skeleton
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("mock-component")).toBeInTheDocument();
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    // Should not show skeleton after loading
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  test("should handle stripe slug conversion", async () => {
    const componentMap = {
      stripepayment: MockComponent,
    };
    const componentMapPromise = Promise.resolve(componentMap);

    render(
      <AsyncDynamicComponent
        componentMapPromise={componentMapPromise}
        slug="stripe"
        testProp="Stripe Component"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-component")).toBeInTheDocument();
      expect(screen.getByText("Stripe Component")).toBeInTheDocument();
    });
  });

  test("should return null when component is not found", async () => {
    const componentMap = {
      "other-app": MockComponent,
    };
    const componentMapPromise = Promise.resolve(componentMap);

    const { container } = render(
      <AsyncDynamicComponent componentMapPromise={componentMapPromise} slug="non-existent-app" />
    );

    await waitFor(() => {
      // After promise resolves, should render nothing (not even wrapper div)
      expect(container.firstChild).toBeNull();
    });
  });

  test("should apply wrapper className", async () => {
    const componentMap = {
      "test-app": MockComponent,
    };
    const componentMapPromise = Promise.resolve(componentMap);

    render(
      <AsyncDynamicComponent
        componentMapPromise={componentMapPromise}
        slug="test-app"
        wrapperClassName="custom-wrapper-class"
        testProp="Test"
      />
    );

    await waitFor(async () => {
      const wrapperDiv = screen.getByTestId("mock-component").parentElement;
      await expect(wrapperDiv).toHaveClass("custom-wrapper-class");
    });
  });

  test("should pass through additional props to component", async () => {
    const componentMap = {
      "test-app": MockComponent,
    };
    const componentMapPromise = Promise.resolve(componentMap);

    render(
      <AsyncDynamicComponent
        componentMapPromise={componentMapPromise}
        slug="test-app"
        testProp="Passed Prop"
        extraProp="should be passed"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Passed Prop")).toBeInTheDocument();
    });
  });

  test("should handle empty wrapper className", async () => {
    const componentMap = {
      "test-app": MockComponent,
    };
    const componentMapPromise = Promise.resolve(componentMap);

    render(
      <AsyncDynamicComponent componentMapPromise={componentMapPromise} slug="test-app" testProp="Test" />
    );

    await waitFor(() => {
      const component = screen.getByTestId("mock-component");
      // Component should be rendered directly without wrapper when wrapperClassName is not provided
      expect(component.parentElement?.tagName).toBe("DIV"); // The test container div
    });
  });

  test("should handle promise rejection gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Mock implementation to silence console errors in tests
    });
    const componentMapPromise = Promise.reject(new Error("Failed to load"));

    const { container } = render(
      <AsyncDynamicComponent componentMapPromise={componentMapPromise} slug="test-app" />
    );

    // Should initially show skeleton
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to load component map:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
