import { render, screen, fireEvent } from "@testing-library/react";
import type { Mock } from "vitest";
import { vi } from "vitest";

import { TestFormDialog } from "../components/SingleForm";
import { findMatchingRoute } from "../lib/processRoute";

vi.mock("../lib/processRoute", () => ({
  findMatchingRoute: vi.fn(),
}));

function mockMatchingRoute(route: any) {
  (findMatchingRoute as Mock<typeof findMatchingRoute>).mockReturnValue({
    ...route,
    id: "matching-route-id",
  });
}

function mockCustomPageMessageMatchingRoute() {
  mockMatchingRoute({
    action: {
      type: "customPageMessage",
      value: "Thank you for submitting!",
    },
  });
}

function mockEventTypeRedirectUrlMatchingRoute() {
  mockMatchingRoute({
    action: {
      type: "eventTypeRedirectUrl",
      value: "john/30min",
    },
  });
}

/**
 * fixes the error due to Formbricks
 */
vi.mock("@calcom/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}));

vi.mock("@calcom/features/shell/Shell", () => ({
  ShellMain: vi.fn(),
}));

vi.mock("@calcom/lib/hooks/useApp", () => ({
  default: vi.fn(),
}));
/**
 *  Avoids the error due to Formbricks
 */

vi.mock("../components/FormActions", () => ({
  FormAction: vi.fn(),
  FormActionsDropdown: vi.fn(),
  FormActionsProvider: vi.fn(),
}));

vi.mock("../../components/react-awesome-query-builder/widgets", () => ({
  default: {},
}));

// Mock the necessary dependencies
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: vi.fn(() => ({ t: (key: string) => key })),
}));

let findTeamMembersMatchingAttributeLogicResponse: {
  result: { users: { email: string }[] } | null;
  checkedFallback: boolean;
  mainWarnings?: string[] | null;
  fallbackWarnings?: string[] | null;
} = {
  result: null,
  checkedFallback: false,
  mainWarnings: null,
  fallbackWarnings: null,
};

function resetFindTeamMembersMatchingAttributeLogicResponse() {
  findTeamMembersMatchingAttributeLogicResponse = {
    result: null,
    checkedFallback: false,
    mainWarnings: null,
    fallbackWarnings: null,
  };
}

function mockFindTeamMembersMatchingAttributeLogicResponse(
  response: typeof findTeamMembersMatchingAttributeLogicResponse
) {
  findTeamMembersMatchingAttributeLogicResponse = response;
}

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      routingForms: {
        findTeamMembersMatchingAttributeLogicOfRoute: {
          useMutation: vi.fn(({ onSuccess }) => {
            return {
              mutate: vi.fn(() => {
                onSuccess(findTeamMembersMatchingAttributeLogicResponse);
              }),
            };
          }),
        },
      },
    },
  },
}));

const mockTeamForm = {
  id: "routing-form-id",
  teamId: "test-team-id",
  name: "Test Form",
  description: "Test form description",
  fields: [
    {
      id: "name",
      identifier: "name",
      type: "text",
      label: "Name",
      required: true,
    },
  ],
  routes: [
    {
      id: "non-matching-route-id",
      isFallback: false,
      action: {
        type: "customPageMessage",
        value: "Not matching",
      },
    },
    {
      id: "matching-route-id",
      isFallback: false,
      action: {
        type: "customPageMessage",
        value: "Thank you for submitting!",
      },
    },
    {
      id: "fallback-route",
      isFallback: true,
      action: {
        type: "customPageMessage",
        value: "Thank you for submitting!",
      },
    },
  ],
} as any;

describe("TestFormDialog", () => {
  beforeEach(() => {
    resetFindTeamMembersMatchingAttributeLogicResponse();
    vi.clearAllMocks();
  });

  it("renders the dialog when open", () => {
    render(
      <TestFormDialog
        form={mockTeamForm}
        isTestPreviewOpen={true}
        setIsTestPreviewOpen={() => {
          return;
        }}
      />
    );

    expect(screen.getByText("test_routing_form")).toBeInTheDocument();
    expect(screen.getByText("test_preview_description")).toBeInTheDocument();
  });

  it("doesn't render the dialog when closed", () => {
    render(
      <TestFormDialog
        form={mockTeamForm}
        isTestPreviewOpen={false}
        setIsTestPreviewOpen={() => {
          return;
        }}
      />
    );

    expect(screen.queryByText("test_routing_form")).not.toBeInTheDocument();
  });

  it("renders form fields", () => {
    render(
      <TestFormDialog
        form={mockTeamForm}
        isTestPreviewOpen={true}
        setIsTestPreviewOpen={() => {
          return;
        }}
      />
    );

    expect(screen.getByTestId("form-field-name")).toBeInTheDocument();
  });

  describe("Team Form", () => {
    it("submits the form and shows test results for Custom Page", async () => {
      mockCustomPageMessageMatchingRoute();
      render(
        <TestFormDialog
          form={mockTeamForm}
          isTestPreviewOpen={true}
          setIsTestPreviewOpen={() => {
            return;
          }}
        />
      );
      fireEvent.change(screen.getByTestId("form-field-name"), { target: { value: "John Doe" } });
      fireEvent.click(screen.getByText("test_routing"));

      expect(screen.getByText("route_to:")).toBeInTheDocument();
      expect(screen.getByTestId("test-routing-result-type")).toHaveTextContent("Custom Page");
      expect(screen.getByTestId("test-routing-result")).toHaveTextContent("Thank you for submitting!");
    });

    it("submits the form and shows test results for Event Type", async () => {
      mockEventTypeRedirectUrlMatchingRoute();
      render(
        <TestFormDialog
          form={mockTeamForm}
          isTestPreviewOpen={true}
          setIsTestPreviewOpen={() => {
            return;
          }}
        />
      );
      fireEvent.change(screen.getByTestId("form-field-name"), { target: { value: "John Doe" } });
      fireEvent.click(screen.getByText("test_routing"));
      expect(screen.getByText("route_to:")).toBeInTheDocument();
      expect(screen.getByTestId("test-routing-result-type")).toHaveTextContent("Event Redirect");
      expect(screen.getByTestId("test-routing-result")).toHaveTextContent("john/30min");
      expect(screen.getByTestId("chosen-route")).toHaveTextContent("Route 2");
      expect(screen.getByTestId("attribute-logic-matched")).toHaveTextContent("yes");
      expect(screen.getByTestId("attribute-logic-fallback-matched")).toHaveTextContent("fallback_not_needed");
      expect(screen.getByTestId("matching-members")).toHaveTextContent(
        "all_assigned_members_of_the_team_event_type_consider_adding_some_attribute_rules"
      );
    });

    it("suggests to add fallback when matching members is empty and fallback is not checked", async () => {
      mockEventTypeRedirectUrlMatchingRoute();
      mockFindTeamMembersMatchingAttributeLogicResponse({
        result: {
          users: [],
        },
        checkedFallback: false,
      });
      render(
        <TestFormDialog
          form={mockTeamForm}
          isTestPreviewOpen={true}
          setIsTestPreviewOpen={() => {
            return;
          }}
        />
      );
      fireEvent.change(screen.getByTestId("form-field-name"), { target: { value: "John Doe" } });
      fireEvent.click(screen.getByText("test_routing"));
      expect(screen.getByText("route_to:")).toBeInTheDocument();
      expect(screen.getByTestId("test-routing-result-type")).toHaveTextContent("Event Redirect");
      expect(screen.getByTestId("test-routing-result")).toHaveTextContent("john/30min");
      expect(screen.getByTestId("chosen-route")).toHaveTextContent("Route 2");
      expect(screen.getByTestId("attribute-logic-matched")).toHaveTextContent("yes");
      expect(screen.getByTestId("attribute-logic-fallback-matched")).toHaveTextContent("fallback_not_needed");
      expect(screen.getByTestId("matching-members")).toHaveTextContent(
        "all_assigned_members_of_the_team_event_type_consider_tweaking_fallback_to_have_a_match"
      );
    });

    it("shows warnings when there are warnings", async () => {
      mockEventTypeRedirectUrlMatchingRoute();
      mockFindTeamMembersMatchingAttributeLogicResponse({
        result: null,
        checkedFallback: false,
        mainWarnings: ["Main-Error-1", "Main-Error-2"],
        fallbackWarnings: ["Fallback-Error-1", "Fallback-Error-2"],
      });
      render(
        <TestFormDialog
          form={mockTeamForm}
          isTestPreviewOpen={true}
          setIsTestPreviewOpen={() => {
            return;
          }}
        />
      );
      fireEvent.change(screen.getByTestId("form-field-name"), { target: { value: "John Doe" } });
      fireEvent.click(screen.getByText("test_routing"));
      screen.logTestingPlaygroundURL();
      const alerts = screen.getAllByTestId("alert");
      expect(alerts).toHaveLength(2);
      expect(alerts[0]).toHaveTextContent("Main-Error-1, Main-Error-2");
      expect(alerts[1]).toHaveTextContent("Fallback-Error-1, Fallback-Error-2");
    });

    it("should not show warnings when there are no warnings", async () => {
      mockEventTypeRedirectUrlMatchingRoute();
      mockFindTeamMembersMatchingAttributeLogicResponse({
        result: null,
        checkedFallback: false,
        mainWarnings: null,
        fallbackWarnings: null,
      });
      render(
        <TestFormDialog
          form={mockTeamForm}
          isTestPreviewOpen={true}
          setIsTestPreviewOpen={() => {
            return;
          }}
        />
      );
      fireEvent.change(screen.getByTestId("form-field-name"), { target: { value: "John Doe" } });
      fireEvent.click(screen.getByText("test_routing"));
      screen.logTestingPlaygroundURL();
      const alerts = screen.queryAllByTestId("alert");
      expect(alerts).toHaveLength(0);
    });

    it("should show No in main and fallback matched", async () => {
      mockEventTypeRedirectUrlMatchingRoute();
      mockFindTeamMembersMatchingAttributeLogicResponse({
        result: {
          users: [],
        },
        checkedFallback: true,
        mainWarnings: null,
        fallbackWarnings: null,
      });
      render(
        <TestFormDialog
          form={mockTeamForm}
          isTestPreviewOpen={true}
          setIsTestPreviewOpen={() => {
            return;
          }}
        />
      );
      fireEvent.change(screen.getByTestId("form-field-name"), { target: { value: "John Doe" } });
      fireEvent.click(screen.getByText("test_routing"));
      expect(screen.getByTestId("attribute-logic-matched")).toHaveTextContent("no");
      expect(screen.getByTestId("attribute-logic-fallback-matched")).toHaveTextContent("no");
      expect(screen.getByTestId("matching-members")).toHaveTextContent(
        "all_assigned_members_of_the_team_event_type_consider_tweaking_fallback_to_have_a_match"
      );
    });
  });

  it("closes the dialog when close button is clicked", () => {
    const setIsTestPreviewOpen = vi.fn();
    render(
      <TestFormDialog
        form={mockTeamForm}
        isTestPreviewOpen={true}
        setIsTestPreviewOpen={setIsTestPreviewOpen}
      />
    );

    fireEvent.click(screen.getByText("close"));

    expect(setIsTestPreviewOpen).toHaveBeenCalledWith(false);
  });
});
