import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTrpc } = vi.hoisted(() => ({
  mockTrpc: {
    viewer: {
      insights: {
        getUserRelevantTeamRoutingForms: { useQuery: vi.fn() },
      },
    },
  },
}));

vi.mock("@calcom/trpc/react", () => ({ trpc: mockTrpc }));
vi.mock("@calcom/ui/components/form", () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  Select: ({
    options,
    value,
    isLoading,
  }: {
    options: Array<{ label: string; value: string }>;
    value?: { label: string; value: string };
    isLoading?: boolean;
    onChange?: (e: { label: string; value: string } | null) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <div data-testid="select">
      {isLoading ? "Loading..." : value ? value.label : options.map((o) => o.label).join(", ")}
    </div>
  ),
}));
vi.mock("../../../components/apps/routing-forms/TestForm", () => ({
  TestForm: ({ form }: { form: { name: string } }) => <div data-testid="test-form">{form.name}</div>,
}));

import InsightsVirtualQueuesPage from "./insights-virtual-queues-view";

describe("InsightsVirtualQueuesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should show empty state when no routing forms available", () => {
    mockTrpc.viewer.insights.getUserRelevantTeamRoutingForms.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    render(<InsightsVirtualQueuesPage />);
    expect(screen.getByText("no_routing_forms")).toBeInTheDocument();
    expect(screen.getByText("empty_routing_forms_description")).toBeInTheDocument();
  });

  it("should render form selector and test form when forms are available", () => {
    const mockForms = [
      { id: "form-1", name: "Contact Form", fields: [] },
      { id: "form-2", name: "Sales Form", fields: [] },
    ];
    mockTrpc.viewer.insights.getUserRelevantTeamRoutingForms.useQuery.mockReturnValue({
      data: mockForms,
      isLoading: false,
    });
    render(<InsightsVirtualQueuesPage />);
    expect(screen.getByText("routing_form")).toBeInTheDocument();
    expect(screen.getByTestId("test-form")).toBeInTheDocument();
    expect(screen.getByTestId("test-form")).toHaveTextContent("Contact Form");
  });

  it("should show loading state", () => {
    mockTrpc.viewer.insights.getUserRelevantTeamRoutingForms.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    render(<InsightsVirtualQueuesPage />);
    expect(screen.getByText("routing_form")).toBeInTheDocument();
  });
});
