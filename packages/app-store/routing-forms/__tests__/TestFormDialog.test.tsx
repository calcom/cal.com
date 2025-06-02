import { render, screen } from "@testing-library/react";
import type { Mock } from "vitest";
import { vi } from "vitest";

import { TestFormRenderer } from "../components/_components/TestForm";
import { findMatchingRoute } from "../lib/processRoute";

vi.mock("framer-motion", async () => {
  return {
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock("../lib/processRoute", () => ({
  findMatchingRoute: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn(() => {
        return;
      }),
    })),
  };
});

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

const mockSubTeamForm = {
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
  team: {
    parentId: "org-1",
  },
} as any;

const mockRegularTeamForm = {
  ...mockSubTeamForm,
  team: {
    parentId: null,
  },
} as any;

describe("TestFormDialog", () => {
  beforeEach(() => {
    resetFindTeamMembersMatchingAttributeLogicResponse();
    vi.clearAllMocks();
  });

  it("renders the dialog when open", () => {
    render(
      <TestFormRenderer
        isMobile={true}
        testForm={mockSubTeamForm}
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
      <TestFormRenderer
        isMobile={true}
        testForm={mockSubTeamForm}
        isTestPreviewOpen={false}
        setIsTestPreviewOpen={() => {
          return;
        }}
      />
    );

    expect(screen.queryByText("test_routing_form")).not.toBeInTheDocument();
  });
});
